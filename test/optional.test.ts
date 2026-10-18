import { assert, test } from 'vitest';
import {
  array,
  boolean,
  check,
  createTypeValidatorTest,
  date,
  invalid,
  messageTree,
  min,
  number,
  object,
  optional,
  string,
  transform,
  valid,
  type Validator,
} from '../src/index.js';

// Each type validator, run on undefined and null.
const missing: [string, Validator][] = [
  ['string', string()],
  ['trimmed string', string(transform((value) => value.trim()))],
  ['number', number()],
  ['date', date()],
  ['boolean', boolean()],
  ['array', array()],
  ['object', object({ name: string() })],
];

// Runs validate on every missing input, labeled for assertion messages.
const runMissing = async (wrap: (validate: Validator) => Validator) =>
  Promise.all(
    missing.flatMap(([label, validate]) =>
      [undefined, null].map(async (value) => ({
        label: `${label}: ${String(value)}`,
        result: await wrap(validate)(value, 'field'),
      })),
    ),
  );

test('type validators reject a missing value with the required code', async () => {
  for (const { label, result } of await runMissing((validate) => validate)) {
    assert.deepInclude(
      result,
      {
        state: 'invalid',
        code: 'required',
        params: {},
        message: 'required',
        field: 'field',
      },
      label,
    );
  }
});

test('optional() accepts a missing value as it is', async () => {
  for (const { label, result } of await runMissing(optional)) {
    assert.equal(result.state, 'valid', label);
  }

  assert.deepInclude(await optional(boolean())(null), { value: null });
});

test('type validators accept present values that look empty', async () => {
  assert.deepInclude(await number()(0), { state: 'valid', value: 0 });
  assert.deepInclude(await boolean()(false), { state: 'valid', value: false });
  assert.deepInclude(await string()(''), { state: 'valid', value: '' });
  assert.deepInclude(await string(transform((value) => value.trim()))('  '), {
    state: 'valid',
    value: '',
  });
  assert.deepInclude(await array()([]), { state: 'valid', value: [] });
});

test('the messages config words a missing value', async () => {
  assert.deepInclude(
    await string({ messages: { required: 'Enter a name.' } })(undefined),
    {
      message: 'Enter a name.',
    },
  );
  assert.deepInclude(
    await number({
      messages: { required: ({ field }) => `${String(field)}?` },
    })(undefined, 'age'),
    { message: 'age?' },
  );
  assert.deepInclude(
    await number({ messages: { required: '{field} is required.' } })(
      null,
      'age',
    ),
    { message: 'age is required.' },
  );
  assert.deepInclude(
    await array({ messages: { required: 'Pick some.' } })(null),
    {
      message: 'Pick some.',
    },
  );
});

test('should fail without errors or a value when required input is missing', async () => {
  assert.deepEqual(await number()(undefined, 'age'), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    field: 'age',
    errors: undefined,
  });
  assert.deepEqual(await array(string())(null), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    field: undefined,
    errors: undefined,
  });
});

test('optional() skips the tests for a missing value only', async () => {
  const validate = optional(string(min(3, 'min')));

  assert.deepInclude(await validate(null), { state: 'valid', value: null });
  assert.deepInclude(await validate(''), { state: 'invalid', message: 'min' });
  assert.deepInclude(await validate('ab'), {
    state: 'invalid',
    message: 'min',
  });
  assert.deepInclude(await validate('abc'), { state: 'valid', value: 'abc' });
});

test('default fills a missing value before it is checked', async () => {
  assert.deepInclude(await string({ default: 'x' })(undefined), {
    state: 'valid',
    value: 'x',
  });
  assert.deepInclude(await optional(number({ default: 1 }))(null), {
    state: 'valid',
    value: 1,
  });
  assert.deepInclude(await array({ default: ['a'] })(null), {
    state: 'valid',
    value: ['a'],
  });
});

test('default fills only a missing value', async () => {
  const validateString = string({ default: 'x' });
  assert.deepInclude(await validateString(null), { value: 'x' });
  assert.deepInclude(await validateString(''), { state: 'valid', value: '' });
  assert.deepInclude(await number({ default: 1 })(0), { value: 0 });
  assert.deepInclude(await boolean({ default: true })(false), {
    value: false,
  });
  assert.deepInclude(await array(string(), { default: ['a'] })([]), {
    state: 'valid',
    value: [],
  });
});

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

test('default applies before optional()', async () => {
  assert.deepInclude(await optional(string({ default: 'x' }))(undefined), {
    state: 'valid',
    value: 'x',
  });
});

test('optional() accepts only undefined and null for a custom validator', async () => {
  const seen: unknown[] = [];
  const custom: Validator<string, string> = async (value, field) => {
    seen.push(value);
    return value === 'ok'
      ? valid({ value, field })
      : invalid({ code: 'custom', message: 'not ok', value, field });
  };
  const validate = optional(custom);

  assert.deepEqual(await validate(undefined, 'name'), {
    state: 'valid',
    value: undefined,
    field: 'name',
  });
  assert.deepInclude(await validate(null), { state: 'valid', value: null });
  assert.deepInclude(await validate(''), {
    state: 'invalid',
    message: 'not ok',
  });
  assert.deepInclude(await validate('ok'), { state: 'valid', value: 'ok' });
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

test('object() takes a config object as its second argument', async () => {
  const validate = object(
    { name: string() },
    { messages: { required: 'Enter a person.' } },
    check((value) => value.name !== 'x', 'x', 'Not x.'),
  );

  assert.deepEqual(await validate(null, 'person'), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'Enter a person.',
    field: 'person',
    errors: undefined,
  });
  assert.deepInclude(await validate({ name: 'x' }), { message: 'Not x.' });
  assert.deepInclude(await validate({ name: 'a' }), { state: 'valid' });
});

test('object() takes a test as its second argument', async () => {
  const validate = object(
    { name: string() },
    check((value) => value.name !== 'x', 'x', 'Not x.'),
    check((value) => value.name !== 'y', 'y', 'Not y.'),
  );

  assert.deepInclude(await validate(undefined), { message: 'required' });
  assert.deepInclude(await validate({ name: 'x' }), { message: 'Not x.' });
  assert.deepInclude(await validate({ name: 'y' }), { message: 'Not y.' });
});

test('object() requires nested objects and fields unless optional()', async () => {
  const validate = object({
    name: string(),
    nickname: optional(string()),
    address: object({ zip: string() }),
    billing: optional(object({ zip: string() })),
  });

  assert.deepEqual(messageTree(await validate({})), {
    name: 'required',
    address: 'required',
  });
  assert.deepEqual(await validate({ name: 'a', address: { zip: '1' } }), {
    state: 'valid',
    value: {
      name: 'a',
      nickname: undefined,
      address: { zip: '1' },
      billing: undefined,
    },
    field: undefined,
  });
  assert.deepEqual(
    messageTree(
      await validate({ name: 'a', address: { zip: '1' }, billing: {} }),
    ),
    { billing: { zip: 'required' } },
  );
});

test('array() requires each item unless the item validator is optional()', async () => {
  assert.deepEqual(messageTree(await array(string())(['a', undefined, null])), [
    null,
    'required',
    'required',
  ]);
  assert.deepInclude(await array(optional(string()))(['a', undefined, null]), {
    state: 'valid',
    value: ['a', undefined, null],
  });
});
