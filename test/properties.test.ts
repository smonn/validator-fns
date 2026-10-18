import * as fc from 'fast-check';
import { assert, test } from 'vitest';
import {
  array,
  boolean,
  date,
  email,
  exact,
  integer,
  invalid,
  matches,
  max,
  maxDate,
  min,
  minDate,
  number,
  object,
  oneOf,
  optional,
  string,
  url,
  uuid,
  valid,
  type Test,
  type Validator,
} from '../src/index';

// Every built-in test, so a generated list can hold any of them.
const stringTests: Test<string, never>[] = [
  min(3, 'min'),
  max(3, 'max'),
  exact(3, 'exact'),
  email('email'),
  url('url'),
  uuid('uuid'),
  matches(/^a/, 'matches'),
  oneOf(['a', 'b'], 'oneOf'),
];
const numberTests: Test<number, never>[] = [
  min(3, 'min'),
  max(3, 'max'),
  exact(3, 'exact'),
  integer('integer'),
  oneOf([1, 2], 'oneOf'),
];
const dateTests: Test<Date, never>[] = [
  minDate('2020-01-01', 'min'),
  maxDate('2020-01-01', 'max'),
];
const arrayTests: Test<unknown[], never>[] = [
  min(3, 'min'),
  max(3, 'max'),
  exact(3, 'exact'),
];

// Built-in tests have the error type never, so they fit their type validator.
const testsFrom = <T>(pool: Test<T, never>[]) =>
  fc.subarray(pool, { minLength: 0 });

// fc.anything with every kind of value it can make, including null-prototype
// objects, boxed primitives, typed arrays, sparse arrays and dates.
const anyValue = fc.anything({
  withBigInt: true,
  withBoxedValues: true,
  withDate: true,
  withMap: true,
  withNullPrototype: true,
  withObjectString: true,
  withSet: true,
  withSparseArray: true,
  withTypedArray: true,
  withUnicodeString: true,
});

test('type validators reject undefined and null unless optional()', async () => {
  const typeValidators = fc.oneof(
    testsFrom(stringTests).map((tests) => string(...tests)),
    testsFrom(numberTests).map((tests) => number(...tests)),
    fc.constant(boolean()),
    testsFrom(dateTests).map((tests) => date(...tests)),
    testsFrom(arrayTests).map((tests) => array(string(), ...tests)),
    fc.constant(object({ name: string(), age: number() })),
  );

  await fc.assert(
    fc.asyncProperty(
      typeValidators,
      fc.constantFrom(undefined, null),
      async (validate: Validator, value) => {
        assert.deepInclude(await validate(value), {
          state: 'invalid',
          message: 'required',
        });
        assert.deepEqual(await optional(validate)(value), {
          state: 'valid',
          value,
          field: undefined,
        });
      },
    ),
  );
});

test('type validators resolve for any input', async () => {
  const validators: Validator[] = [
    string(),
    number(),
    boolean(),
    date(),
    array(string()),
    object({ a: string() }),
  ];
  await fc.assert(
    fc.asyncProperty(anyValue, async (value) => {
      for (const validate of validators) {
        const result = await validate(value);
        assert.oneOf(result.state, ['valid', 'invalid']);
      }
    }),
  );
});

// The amount min(), max() and exact() compare: a number itself, or the length
// of a string or array. An empty string is a string of length 0 (#660).
const sized = fc.oneof(fc.double(), fc.string(), fc.array(fc.anything()));
const amountOf = (value: number | string | unknown[]) =>
  typeof value === 'number' ? value : value.length;

test('min(), max() and exact() agree with a plain comparison', async () => {
  await fc.assert(
    fc.asyncProperty(
      sized,
      fc.integer({ min: -5, max: 10 }),
      async (value, limit) => {
        const amount = amountOf(value);
        const isValid = async (validate: Test<number | string | unknown[]>) =>
          (await validate(value)).state === 'valid';

        assert.equal(await isValid(min(limit, 'min')), amount >= limit);
        assert.equal(await isValid(max(limit, 'max')), amount <= limit);
        assert.equal(await isValid(exact(limit, 'exact')), amount === limit);
      },
    ),
  );
});

// A property validator that passes or fails as generated, so the expected
// errors are known.
const fixedResult =
  (passes: boolean): Validator =>
  async (value, field) =>
    passes
      ? valid({ value, field })
      : invalid({
          code: 'custom',
          message: `${String(field)} failed`,
          value,
          field,
        });

// fc.string makes names like __proto__ and constructor on purpose, but in
// under a fifth of runs, so the Object.prototype names are also drawn directly.
const schemaKey = fc.oneof(
  fc.constantFrom(...Object.getOwnPropertyNames(Object.prototype)),
  fc.string({ minLength: 1 }),
);

test('object() reports errors for exactly the invalid fields', async () => {
  // Pairs rather than fc.dictionary, which never makes an own __proto__ key.
  const schemas = fc.uniqueArray(fc.tuple(schemaKey, fc.boolean()), {
    selector: ([key]) => key,
  });

  await fc.assert(
    fc.asyncProperty(schemas, async (fields) => {
      const properties = Object.fromEntries(
        fields.map(([key, pass]) => [key, fixedResult(pass)]),
      );
      const failing = fields.filter(([, pass]) => !pass).map(([key]) => key);

      const result = await object(properties)({});

      if (failing.length === 0) {
        assert.equal(result.state, 'valid');
      } else {
        assert.equal(result.state, 'invalid');
        assert.sameMembers(
          Object.keys((result.state === 'invalid' && result.errors) || {}),
          failing,
        );
      }
    }),
  );
});

test('object() passes undefined for keys missing from the input', async () => {
  const keys = fc.uniqueArray(schemaKey, { minLength: 1 });

  await fc.assert(
    fc.asyncProperty(keys, async (schemaKeys) => {
      const received: unknown[] = [];
      const record: Validator = async (value, field) => {
        received.push(value);
        return valid({ value, field });
      };

      await object(Object.fromEntries(schemaKeys.map((key) => [key, record])))(
        {},
      );

      assert.deepEqual(
        received,
        schemaKeys.map(() => undefined),
      );
    }),
  );
});
