import { assert, test } from 'vitest';
import { email, max, min, required, string, url } from '../src/index';

test('min', async () => {
  const validate = min(5, 'min:{min}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('foo'), {
    state: 'invalid',
    message: 'min:5',
    field: undefined,
    isValid: false,
    errors: undefined,
    value: 'foo',
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('foo bar'), {
    state: 'invalid',
    value: 'foo bar',
    message: 'max:5',
    field: undefined,
    isValid: false,
    errors: undefined,
  });
});

test('email', async () => {
  const validate = email('invalid email');
  assert.deepEqual(await validate('name@example.com'), {
    state: 'valid',
    value: 'name@example.com',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('name@host'), {
    state: 'valid',
    value: 'name@host',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('name+tag@example.com'), {
    state: 'valid',
    value: 'name+tag@example.com',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('@example.com'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: '@example.com',
    message: 'invalid email',
  });
  assert.deepEqual(await validate('name.com'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: 'name.com',
    message: 'invalid email',
  });
  assert.deepEqual(await validate('name@.com'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: 'name@.com',
    message: 'invalid email',
  });
});

test('url', async () => {
  const validate = url('invalid url', ['http:', 'mailto:', 'https:']);
  assert.deepEqual(await validate('http://example.com'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'http://example.com',
  });
  assert.deepEqual(await validate('mailto:name@example.com'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'mailto:name@example.com',
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '',
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: 0 as unknown as string,
    message: 'invalid url',
  });
  assert.deepEqual(await validate('/foo'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: '/foo',
    message: 'invalid url',
  });
  assert.deepEqual(await validate('unknown://path'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    value: 'unknown://path',
    errors: undefined,
    message: 'invalid url',
  });
});

test('string', async () => {
  const validate = string(
    { trim: true },
    required('Must enter a value.'),
    min(5, 'At least five characters.'),
    max(10, 'At most ten characters.'),
  );

  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(12_345), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '12345',
  });
  assert.deepEqual(await validate('  test  '), {
    state: 'invalid',
    message: 'At least five characters.',
    value: 'test',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate('hello world'), {
    state: 'invalid',
    message: 'At most ten characters.',
    value: 'hello world',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: '',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(new Date(0)), {
    state: 'invalid',
    message: 'At most ten characters.',
    value: '1970-01-01T00:00:00.000Z',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate({ name: 'August' }), {
    state: 'invalid',
    message: 'Failed to parse value to string.',
    value: { name: 'August' } as unknown as string,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
});

test('string default', async () => {
  const validate = string({ default: 'hello' });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate('other'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'other',
  });
  // Will cast 123 to '123'
  assert.deepEqual(await validate(123), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '123',
  });
  // Will cast 0 to '0'
  assert.deepEqual(await validate(0), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '0',
  });
  // Will cast false to 'false'
  assert.deepEqual(await validate(false), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'false',
  });
});
