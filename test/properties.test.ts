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
  string,
  url,
  uuid,
  valid,
  type ValidatorTest,
} from '../src/index';

// Every test that isn't required(), so a generated list can hold any of them.
const stringTests = [
  min(3, 'min'),
  max(3, 'max'),
  exact(3, 'exact'),
  email('email'),
  url('url'),
  uuid('uuid'),
  matches(/^a/, 'matches'),
  oneOf(['a', 'b'], 'oneOf'),
];
const numberTests = [
  min(3, 'min'),
  max(3, 'max'),
  exact(3, 'exact'),
  integer('integer'),
  oneOf([1, 2], 'oneOf'),
];
const dateTests = [minDate('2020-01-01', 'min'), maxDate('2020-01-01', 'max')];
const arrayTests = [min(3, 'min'), max(3, 'max'), exact(3, 'exact')];

const testsFrom = (pool: ValidatorTest[]) =>
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

test('type validators accept undefined unless required() is set', async () => {
  const typeValidators = fc.oneof(
    testsFrom(stringTests).map((tests) => string(...tests)),
    testsFrom(numberTests).map((tests) => number(...tests)),
    fc.constant(boolean()),
    testsFrom(dateTests).map((tests) => date(...tests)),
    testsFrom(arrayTests).map((tests) => array(string(), ...tests)),
    fc.constant(object({ name: string(), age: number() })),
  );

  await fc.assert(
    fc.asyncProperty(typeValidators, async (validate) => {
      const result = await validate(undefined);
      assert.equal(result.state, 'valid');
    }),
  );
});

test('string() and number() resolve for any input', async () => {
  await fc.assert(
    fc.asyncProperty(anyValue, async (value) => {
      for (const validate of [string(), number()]) {
        const result = await validate(value);
        assert.oneOf(result.state, ['valid', 'invalid']);
      }
    }),
  );
});

// The amount min(), max() and exact() compare: a number itself, or the length
// of a string or array.
const sized = fc.oneof(
  fc.double(),
  fc.string({ minLength: 1 }),
  fc.array(fc.anything()),
);
const amountOf = (value: number | string | unknown[]) =>
  typeof value === 'number' ? value : value.length;

test('min(), max() and exact() agree with a plain comparison', async () => {
  await fc.assert(
    fc.asyncProperty(
      sized,
      fc.integer({ min: -5, max: 10 }),
      fc.boolean(),
      async (value, limit, exclusive) => {
        const amount = amountOf(value);
        const isValid = async (validate: ValidatorTest) =>
          (await validate(value)).state === 'valid';

        assert.equal(
          await isValid(min(limit, 'min', exclusive)),
          exclusive ? amount > limit : amount >= limit,
        );
        assert.equal(
          await isValid(max(limit, 'max', exclusive)),
          exclusive ? amount < limit : amount <= limit,
        );
        assert.equal(await isValid(exact(limit, 'exact')), amount === limit);
      },
    ),
  );
});

test('min(), max() and exact() accept an empty string at any limit', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer(), async (limit) => {
      for (const validate of [
        min(limit, 'min'),
        max(limit, 'max'),
        exact(limit, 'exact'),
      ]) {
        assert.equal((await validate('')).state, 'valid');
      }
    }),
  );
});

// A property validator that passes or fails as generated, so the expected
// errors are known.
const fixedResult =
  (passes: boolean): ValidatorTest =>
  async (value, field) =>
    passes
      ? valid({ value, field })
      : invalid({ message: `${String(field)} failed`, value, field });

// fc.string makes names like __proto__ and constructor on purpose.
const schemaKey = fc.string({ minLength: 1 });

// object() drops a __proto__ key from errors today (#598), which removes this
// filter.
const writableKey = schemaKey.filter((key) => key !== '__proto__');

test('object() reports errors for exactly the invalid fields', async () => {
  const schemas = fc.dictionary(writableKey, fc.boolean(), {
    noNullPrototype: true,
  });

  await fc.assert(
    fc.asyncProperty(schemas, async (passes) => {
      const properties = Object.fromEntries(
        Object.entries(passes).map(([key, pass]) => [key, fixedResult(pass)]),
      );
      const failing = Object.keys(passes).filter((key) => !passes[key]);

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
      const record: ValidatorTest = async (value, field) => {
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
