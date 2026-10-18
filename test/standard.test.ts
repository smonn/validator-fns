import { assert, expectTypeOf, test } from 'vitest';
import * as validatorFns from '../src/index.js';
import {
  array,
  boolean,
  createTypeValidator,
  createValidator,
  date,
  invalid,
  min,
  number,
  object,
  optional,
  string,
  valid,
  type Result,
  type TypeValidator,
} from '../src/index.js';

/** The same type as StandardSchemaV1.InferOutput, without importing it. */
type InferOutput<S> = S extends {
  '~standard': { types?: { output: infer O } | undefined };
}
  ? O
  : never;

test('should describe the library', () => {
  const schema = string();

  assert.strictEqual(schema['~standard'].version, 1);
  assert.strictEqual(schema['~standard'].vendor, 'validator-fns');
});

const passThrough = async (value: unknown, field?: string) =>
  valid({ value, field });

const hello = async (
  value: unknown,
  field?: string,
): Promise<Result<'hello', { code: number }>> =>
  value === 'hello'
    ? valid({ value, field })
    : invalid({
        code: 'hello',
        message: 'Must be "hello".',
        value,
        field,
        errors: { code: 1 },
      });

test('should add ~standard to a function and keep its results and field', async () => {
  const schema = createValidator(hello);

  assert.notStrictEqual(schema, hello);
  assert.notProperty(hello, '~standard');
  assert.strictEqual(schema['~standard'].version, 1);
  assert.strictEqual(schema['~standard'].vendor, 'validator-fns');
  assert.deepEqual(await schema('hello', 'greeting'), {
    state: 'valid',
    value: 'hello',
    field: 'greeting',
  });
  assert.deepEqual(await schema('hi', 'greeting'), {
    state: 'invalid',
    code: 'hello',
    params: {},
    message: 'Must be "hello".',
    field: 'greeting',
    errors: { code: 1 },
  });
  assert.deepEqual(await schema['~standard'].validate('hello'), {
    value: 'hello',
  });
  assert.deepEqual<unknown>(await schema['~standard'].validate('hi'), {
    issues: [{ message: 'Must be "hello".', code: 'hello', params: {} }],
  });
});

test('should return a validator that already has ~standard as it is', () => {
  const validate = string();
  const wrapped = createValidator(passThrough);

  assert.strictEqual(createValidator(validate), validate);
  assert.strictEqual(createValidator(optional(validate)), optional(validate));
  assert.strictEqual(createValidator(wrapped), wrapped);
});

test('should infer the value and error types from the function', () => {
  expectTypeOf(createValidator(hello)).toEqualTypeOf<
    TypeValidator<'hello', { code: number }>
  >();
  expectTypeOf(createValidator(passThrough)).toEqualTypeOf<
    TypeValidator<unknown, never>
  >();
  expectTypeOf(createValidator(string())).toEqualTypeOf<
    TypeValidator<string, string>
  >();
});

test('should take only async functions', () => {
  expectTypeOf<(value: unknown) => Result<string, never>>().not.toExtend<
    Parameters<typeof createValidator<string, never>>[0]
  >();
});

test('should export only the v3 surface', () => {
  assert.deepEqual(Object.keys(validatorFns).toSorted(), [
    'FailureError',
    'array',
    'boolean',
    'check',
    'coerce',
    'createTypeValidator',
    'createValidator',
    'createValidatorTest',
    'date',
    'email',
    'exact',
    'integer',
    'invalid',
    'matches',
    'max',
    'maxDate',
    'messageTree',
    'min',
    'minDate',
    'number',
    'object',
    'oneOf',
    'optional',
    'parse',
    'string',
    'transform',
    'url',
    'uuid',
    'valid',
    'withMessages',
  ]);
});

const money = createTypeValidator(async (value: unknown, field?: string) =>
  valid({ value: typeof value === 'number' ? value : null, field }),
);

// Every kind of type validator, with an input it accepts and one it rejects.
const typeValidators: [
  string,
  TypeValidator<unknown, unknown>,
  unknown,
  unknown,
][] = [
  ['string', string(), 'a', 1],
  ['number', number(), 1, 'x'],
  ['boolean', boolean(), true, null],
  ['date', date(), new Date(0), undefined],
  ['array', array(string()), ['a'], [1]],
  ['object', object({ name: string() }), { name: 'a' }, {}],
  ['createTypeValidator', money(), 1, 'x'],
  ['optional()', optional(string(min(2, 'short'))), undefined, 'a'],
  [
    'optional() of a custom validator',
    optional(async () =>
      invalid({ code: 'custom', message: 'no', value: 1, field: undefined }),
    ),
    null,
    1,
  ],
];

test('should be a Standard Schema for every type validator', async () => {
  const results = await Promise.all(
    typeValidators.map(async ([label, schema, accepted, rejected]) => ({
      label,
      props: schema['~standard'],
      ok: await schema['~standard'].validate(accepted),
      failed: await schema['~standard'].validate(rejected),
    })),
  );

  for (const { label, props, ok, failed } of results) {
    assert.strictEqual(props.version, 1, label);
    assert.strictEqual(props.vendor, 'validator-fns', label);
    assert.notProperty(ok, 'issues', label);
    assert.property(failed, 'issues', label);
  }
});

test('should type the output as the valid result value', () => {
  const schema = object({ name: string() });
  expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<{ name: string }>();

  expectTypeOf<
    InferOutput<ReturnType<typeof string>>
  >().toEqualTypeOf<string>();
  expectTypeOf<InferOutput<typeof optionalString>>().toEqualTypeOf<
    string | null | undefined
  >();

  const custom = createValidator(hello);
  expectTypeOf<InferOutput<typeof custom>>().toEqualTypeOf<'hello'>();
});

const optionalString = optional(string());
