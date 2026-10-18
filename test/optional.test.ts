import { assert, test } from 'vitest';
import {
  createTypeValidatorTest,
  invalid,
  min,
  number,
  optional,
  string,
  transform,
  valid,
  type Validator,
} from '../src/index.js';

test('default skips the parser, and the tests run on it', async () => {
  const parsed: unknown[] = [];
  const validate = string({
    default: 'x',
    parser: (value, field) => {
      parsed.push(value);
      return valid({ value: String(value), field });
    },
  });
  assert.deepInclude(await validate(undefined), { value: 'x' });
  assert.deepEqual(parsed, []);

  assert.deepInclude(await number({ default: 0 }, min(1))(undefined), {
    state: 'invalid',
    code: 'min',
  });
  const trimmed = string(
    { default: ' x ' },
    transform((value) => value.trim()),
  );
  assert.deepInclude(await trimmed(null), { value: 'x' });
});

test('optional() calls a custom validator only for a present value', async () => {
  const seen: unknown[] = [];
  const custom: Validator<string, string> = async (value, field) => {
    seen.push(value);
    return value === 'ok'
      ? valid({ value, field })
      : invalid({ code: 'custom', message: 'not ok', value, field });
  };
  const validate = optional(custom);

  await validate(undefined, 'name');
  await validate(null);
  await validate('');
  await validate('ok');
  assert.deepEqual(seen, ['', 'ok']);
});

test('optional() leaves the validator it wraps unchanged', async () => {
  const validate = string();
  const optionalString = optional(validate);

  assert.notStrictEqual(optionalString, validate);
  assert.deepInclude(await validate(undefined), { state: 'invalid' });
  assert.deepInclude(await optional(optionalString)(undefined), {
    state: 'valid',
  });
});

test('validators from createTypeValidatorTest are required unless optional()', async () => {
  const upper = createTypeValidatorTest(
    {
      parser: async (value, field) =>
        valid({ value: typeof value === 'string' ? value : undefined, field }),
    },
    (value) => (typeof value === 'string' ? value.toUpperCase() : value),
  );

  assert.deepInclude(await upper()(1), { message: 'required' });
  assert.deepInclude(await upper({ messages: { required: 'Text.' } })(null), {
    message: 'Text.',
  });
  assert.deepInclude(await optional(upper())(1), { state: 'valid' });
  assert.deepInclude(await upper()('a'), { state: 'valid', value: 'A' });
});
