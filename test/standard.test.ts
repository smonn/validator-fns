import { assert, expectTypeOf, test } from 'vitest';
import {
  array,
  boolean,
  createTypeValidatorTest,
  date,
  email,
  invalid,
  matches,
  max,
  min,
  number,
  object,
  optional,
  parseNumber,
  standard,
  string,
  valid,
  type TypeValidator,
} from '../src/index.js';

/** The same type as StandardSchemaV1.InferOutput, without importing it. */
type InferOutput<S> = S extends {
  '~standard': { types?: { output: infer O } | undefined };
}
  ? O
  : never;

test('should describe the library when wrapped', () => {
  const schema = standard(string());

  assert.strictEqual(schema['~standard'].version, 1);
  assert.strictEqual(schema['~standard'].vendor, 'validator-fns');
});

test('should return the parsed value when the input is valid', async () => {
  const schema = standard(string({ trim: true }));

  assert.deepEqual(await schema['~standard'].validate(' a '), { value: 'a' });
});

test('should report each nested error with its path when an object fails', async () => {
  const schema = standard(
    object({
      email: string(email('Must be an email.')),
      tags: array(
        string(min(2, 'Tag too short.')),
        max(2, 'At most two tags.'),
      ),
      address: object({ zip: string(matches(/^\d{5}$/, 'Five digits.')) }),
      silent: async (value: unknown, field?: string) =>
        invalid({ message: '', value, field }),
    }),
  );

  const result = await schema['~standard'].validate({
    email: 'nope',
    tags: ['a', 'bb', 'c'],
    address: { zip: '1' },
    silent: 1,
  });

  assert.deepEqual(result, {
    issues: [
      { message: 'Must be an email.', path: ['email'] },
      { message: 'At most two tags.', path: ['tags'] },
      { message: 'Five digits.', path: ['address', 'zip'] },
      { message: 'Invalid value.', path: ['silent'] },
    ],
  });
});

test('should report the array message and each item error when an array fails', async () => {
  const schema = standard(
    array(string(min(2, 'short')), max(2, 'At most two.')),
  );

  assert.deepEqual(await schema['~standard'].validate(['a', 'bb', 'c']), {
    issues: [
      { message: 'At most two.' },
      { message: 'short', path: [0] },
      { message: 'short', path: [2] },
    ],
  });
});

test('should report one issue when a validator fails without a message', async () => {
  const schema = standard(async (value: unknown, field?: string) =>
    invalid({ message: '', value, field }),
  );

  assert.deepEqual(await schema['~standard'].validate('x'), {
    issues: [{ message: 'Invalid value.' }],
  });
});

test('should give a fallback message when an error is not a string', async () => {
  const schema = standard(
    object({
      code: async (value: unknown, field?: string) =>
        invalid({ message: '', value, field, errors: 42 }),
    }),
  );

  assert.deepEqual(await schema['~standard'].validate({ code: 1 }), {
    issues: [{ message: 'Invalid value.', path: ['code'] }],
  });
});

const passThrough = async (value: unknown, field?: string) =>
  valid({ value, field });

test('should leave a custom validator unchanged when wrapping it', async () => {
  const schema = standard(passThrough);

  assert.notStrictEqual(schema, passThrough);
  assert.notProperty(passThrough, '~standard');
  assert.deepEqual(await schema('a', 'name'), await passThrough('a', 'name'));
});

test('should return a type validator as it is', () => {
  const validate = string();

  assert.strictEqual(standard(validate), validate);
  assert.strictEqual(standard(optional(validate)), optional(validate));
});

const money = createTypeValidatorTest(
  { parser: parseNumber },
  (value, config) => config.parser(value),
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
      invalid({ message: 'no', value: 1, field: undefined }),
    ),
    null,
    1,
  ],
];

test('should be a Standard Schema without standard() for every type validator', async () => {
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
  const schema = standard(object({ name: string() }));
  expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<{ name: string }>();

  expectTypeOf<
    InferOutput<ReturnType<typeof string>>
  >().toEqualTypeOf<string>();
  expectTypeOf<InferOutput<typeof optionalString>>().toEqualTypeOf<
    string | null | undefined
  >();

  const optionalSchema = standard(optional(string()));
  expectTypeOf<InferOutput<typeof optionalSchema>>().toEqualTypeOf<
    string | null | undefined
  >();
});

const optionalString = optional(string());
