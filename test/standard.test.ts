import { assert, expectTypeOf, test } from 'vitest';
import * as validatorFns from '../src/index.js';
import {
  array,
  boolean,
  createTypeValidatorTest,
  createValidator,
  date,
  email,
  invalid,
  matches,
  max,
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

test('should return the parsed value when the input is valid', async () => {
  const schema = string({ trim: true });

  assert.deepEqual(await schema['~standard'].validate(' a '), { value: 'a' });
});

test('should report each nested error with its path when an object fails', async () => {
  const schema = object({
    email: string(email('Must be an email.')),
    tags: array(string(min(2, 'Tag too short.')), max(2, 'At most two tags.')),
    address: object({ zip: string(matches(/^\d{5}$/, 'Five digits.')) }),
    unworded: async (value: unknown, field?: string) =>
      invalid({ code: 'custom', value, field }),
  });

  const result = await schema['~standard'].validate({
    email: 'nope',
    tags: ['a', 'bb', 'c'],
    address: { zip: '1' },
    unworded: 1,
  });

  assert.deepEqual(result, {
    issues: [
      { message: 'Must be an email.', path: ['email'] },
      { message: 'At most two tags.', path: ['tags'] },
      { message: 'Five digits.', path: ['address', 'zip'] },
      { message: 'custom', path: ['unworded'] },
    ],
  });
});

test('should report the array message and each item error when an array fails', async () => {
  const schema = array(string(min(2, 'short')), max(2, 'At most two.'));

  assert.deepEqual<unknown>(
    await schema['~standard'].validate(['a', 'bb', 'c']),
    {
      issues: [
        { message: 'At most two.', code: 'max', params: { max: 2, amount: 3 } },
        { message: 'short', path: [0] },
        { message: 'short', path: [2] },
      ],
    },
  );
});

test('should report one issue with the code as the message when a validator fails without one', async () => {
  const schema = createValidator(async (value: unknown, field?: string) =>
    invalid({ code: 'custom', value, field }),
  );

  assert.deepEqual<unknown>(await schema['~standard'].validate('x'), {
    issues: [{ message: 'custom', code: 'custom', params: {} }],
  });
});

test('should give the code as the message when an error is not a string', async () => {
  const schema = createValidator(async (value: unknown, field?: string) =>
    invalid({ code: 'odd', value, field, errors: { count: 42 } }),
  );

  assert.deepEqual<unknown>(await schema['~standard'].validate('x'), {
    issues: [
      { message: 'odd', code: 'odd', params: {} },
      { message: 'odd', path: ['count'] },
    ],
  });
});

test('should report the container itself when its errors hold no issue', async () => {
  const schema = createValidator(async (value: unknown, field?: string) =>
    invalid({ code: 'items', value, field, errors: [null] }),
  );

  assert.deepEqual<unknown>(await schema['~standard'].validate([1]), {
    issues: [{ message: 'items', code: 'items', params: {} }],
  });
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
    issues: [
      { message: 'Must be "hello".', code: 'hello', params: {} },
      { message: 'hello', path: ['code'] },
    ],
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
    'array',
    'boolean',
    'check',
    'createTypeValidatorTest',
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
    'min',
    'minDate',
    'number',
    'object',
    'oneOf',
    'optional',
    'string',
    'url',
    'uuid',
    'valid',
  ]);
});

const money = createTypeValidatorTest(
  {
    parser: async (value: unknown, field?: string) =>
      valid({ value: typeof value === 'number' ? value : null, field }),
  },
  (value: number | null | undefined) => value,
);

// Every kind of type validator, with an input it accepts and one it rejects.
const typeValidators: [
  string,
  TypeValidator<unknown, unknown>,
  unknown,
  unknown,
][] = [
  ['string', string(), 'a', ''],
  ['number', number(), '1', 'x'],
  ['boolean', boolean(), true, null],
  ['date', date(), '2020-01-01', undefined],
  ['array', array(string()), ['a'], ['']],
  ['object', object({ name: string() }), { name: 'a' }, {}],
  ['createTypeValidatorTest', money(), 1, null],
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
