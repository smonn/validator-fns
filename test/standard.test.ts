import { assert, expectTypeOf, test } from 'vitest';
import {
  array,
  email,
  invalid,
  matches,
  max,
  min,
  object,
  standard,
  string,
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

test('should leave the wrapped validator unchanged when wrapping it', async () => {
  const validate = string();
  const schema = standard(validate);

  assert.notProperty(validate, '~standard');
  assert.deepEqual(await schema('a', 'name'), await validate('a', 'name'));
});

test('should type the output as the valid result value when wrapped', () => {
  const schema = standard(object({ name: string() }));

  expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<
    { name?: string } | null | undefined
  >();
});
