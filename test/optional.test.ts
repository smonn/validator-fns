import { assert, test } from 'vitest';
import {
  array,
  boolean,
  check,
  createTypeValidatorTest,
  date,
  invalid,
  min,
  number,
  object,
  optional,
  string,
  valid,
  type Validator,
} from '../src/index.js';

const invalidDate = new Date('');

// Each validator with the inputs that parse to a missing value.
const missing: [string, Validator, unknown[]][] = [
  ['string', string(), [undefined, null, '']],
  ['trimmed string', string({ trim: true }), ['  ']],
  ['number', number(), [undefined, null, '', '  ', Number.NaN, invalidDate]],
  ['date', date(), [undefined, null, '', Number.NaN, invalidDate]],
  ['boolean', boolean(), [undefined, null]],
  ['array', array(), [undefined, null]],
  ['object', object({}), [undefined, null]],
];

// Runs validate on every missing input, labeled for assertion messages.
const runMissing = async (wrap: (validate: Validator) => Validator) =>
  Promise.all(
    missing.flatMap(([label, validate, values]) =>
      values.map(async (value) => ({
        label: `${label}: ${String(value)}`,
        result: await wrap(validate)(value, 'field'),
      })),
    ),
  );

test('type validators reject a missing value with the built-in message', async () => {
  for (const { label, result } of await runMissing((validate) => validate)) {
    assert.deepInclude(
      result,
      { state: 'invalid', message: 'Required.', field: 'field' },
      label,
    );
  }
});

test('optional() accepts a missing value as parsed', async () => {
  for (const { label, result } of await runMissing(optional)) {
    assert.equal(result.state, 'valid', label);
  }

  assert.deepEqual(await optional(string({ trim: true }))('  '), {
    state: 'valid',
    value: '',
    field: undefined,
  });
  assert.deepInclude(await optional(number())(''), { value: Number.NaN });
  assert.deepInclude(await optional(date())(''), { value: invalidDate });
  assert.deepInclude(await optional(boolean())(null), { value: null });
});

test('type validators accept present values that look empty', async () => {
  assert.deepInclude(await number()(0), { state: 'valid', value: 0 });
  assert.deepInclude(await boolean()(false), { state: 'valid', value: false });
  assert.deepInclude(await string()(' '), { state: 'valid', value: ' ' });
  assert.deepInclude(await array()([]), { state: 'valid', value: [] });
  assert.deepInclude(await array()(''), { state: 'valid', value: [] });
});

test('requiredMessage sets the message for a missing value', async () => {
  assert.deepInclude(await string({ requiredMessage: 'Enter a name.' })(''), {
    message: 'Enter a name.',
  });
  assert.deepInclude(
    await number({ requiredMessage: ({ field }) => `${String(field)}?` })(
      undefined,
      'age',
    ),
    { message: 'age?' },
  );
  assert.deepInclude(
    await number({ requiredMessage: '{field} is required.' })(null, 'age'),
    { message: 'age is required.' },
  );
  assert.deepInclude(await array({ requiredMessage: 'Pick some.' })(null), {
    message: 'Pick some.',
  });
});

test('a missing value fails without errors and keeps the parsed value', async () => {
  assert.deepEqual(await number()('', 'age'), {
    state: 'invalid',
    message: 'Required.',
    value: Number.NaN,
    field: 'age',
    errors: undefined,
  });
  assert.deepEqual(await array(string())(null), {
    state: 'invalid',
    message: 'Required.',
    value: null,
    field: undefined,
    errors: undefined,
  });
});

test('a throwing requiredMessage gives an invalid result in a type validator', async () => {
  const validate = string({
    requiredMessage: () => {
      throw new Error('boom');
    },
  });

  assert.deepInclude(await validate(''), { state: 'invalid', message: 'boom' });
});

test('optional() skips the tests for a missing value only', async () => {
  const validate = optional(string(min(3, 'min')));

  assert.deepInclude(await validate(''), { state: 'valid', value: '' });
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
  assert.deepInclude(await optional(number({ default: 1 }))(''), {
    state: 'valid',
    value: 1,
  });
  assert.deepInclude(await array({ default: ['a'] })(null), {
    state: 'valid',
    value: ['a'],
  });
});

test('optional() accepts only undefined and null for a custom validator', async () => {
  const seen: unknown[] = [];
  const custom: Validator<string, string> = async (value, field) => {
    seen.push(value);
    return value === 'ok'
      ? valid({ value, field })
      : invalid({ message: 'not ok', value, field });
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
  assert.deepInclude(await validate(''), { state: 'invalid' });
  assert.deepInclude(await optional(optionalString)(''), { state: 'valid' });
});

test('validators from createTypeValidatorTest are required unless optional()', async () => {
  const upper = createTypeValidatorTest(
    { parser: (value) => (typeof value === 'string' ? value : undefined) },
    (value, config) => {
      const parsed = config.parser(value);
      return typeof parsed === 'string' ? parsed.toUpperCase() : parsed;
    },
  );

  assert.deepInclude(await upper()(1), { message: 'Required.' });
  assert.deepInclude(await upper({ requiredMessage: 'Text.' })(''), {
    message: 'Text.',
  });
  assert.deepInclude(await optional(upper())(1), { state: 'valid' });
  assert.deepInclude(await upper()('a'), { state: 'valid', value: 'A' });
});

test('object() takes a config object as its second argument', async () => {
  const validate = object(
    { name: string() },
    { requiredMessage: 'Enter a person.' },
    check((value) => value.name !== 'x', 'Not x.'),
  );

  assert.deepEqual(await validate(null, 'person'), {
    state: 'invalid',
    message: 'Enter a person.',
    value: null,
    field: 'person',
    errors: undefined,
  });
  assert.deepInclude(await validate({ name: 'x' }), { message: 'Not x.' });
  assert.deepInclude(await validate({ name: 'a' }), { state: 'valid' });
});

test('object() takes a test as its second argument', async () => {
  const validate = object(
    { name: string() },
    check((value) => value.name !== 'x', 'Not x.'),
    check((value) => value.name !== 'y', 'Not y.'),
  );

  assert.deepInclude(await validate(undefined), { message: 'Required.' });
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

  assert.deepInclude(await validate({}), {
    state: 'invalid',
    errors: { name: 'Required.', address: 'Required.' },
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
  assert.deepInclude(
    await validate({ name: 'a', address: { zip: '1' }, billing: {} }),
    { errors: { billing: { zip: 'Required.' } } },
  );
});

test('array() requires each item unless the item validator is optional()', async () => {
  assert.deepInclude(await array(string())(['a', '', null]), {
    state: 'invalid',
    errors: [null, 'Required.', 'Required.'],
  });
  assert.deepInclude(await array(optional(string()))(['a', '', null]), {
    state: 'valid',
    value: ['a', '', null],
  });
});
