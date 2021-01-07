import { max, min, required } from '../src/shared';
import { email, string, url } from '../src/strings';

test('min', async () => {
  const validate = min(5, 'min:{min}');
  expect(await validate('hello')).toMatchObject({ isValid: true });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('foo')).toMatchObject({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'min:5',
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}');
  expect(await validate('hello')).toMatchObject({ isValid: true });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('foo bar')).toMatchObject({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'max:5',
  });
});

test('email', async () => {
  const validate = email('invalid email');
  expect(await validate('name@example.com')).toMatchObject({ isValid: true });
  expect(await validate('name@host')).toMatchObject({ isValid: true });
  expect(await validate('name+tag@example.com')).toMatchObject({
    isValid: true,
    state: 'valid',
  });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('@example.com')).toMatchObject({ isValid: false });
  expect(await validate('name.com')).toMatchObject({ isValid: false });
  expect(await validate('name@.com')).toMatchObject({ isValid: false });
});

test('url', async () => {
  const validate = url('invalid url', ['http:', 'mailto:', 'https:']);
  expect(await validate('http://example.com')).toMatchObject({ isValid: true });
  expect(await validate('mailto:name@example.com')).toMatchObject({
    isValid: true,
    state: 'valid',
  });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('/foo')).toMatchObject({ isValid: false });
  expect(await validate('unknown://path')).toMatchObject({
    isValid: false,
    state: 'invalid',
    errors: null,
  });
});

test('string', async () => {
  const validate = string(
    { trim: true },
    required('Must enter a value.'),
    min(5, 'At least five characters.'),
    max(10, 'At most ten characters.')
  );

  expect(await validate('hello')).toEqual({
    isValid: true,
    state: 'valid',
    value: 'hello',
  });
  expect(await validate(12345)).toEqual({
    isValid: true,
    state: 'valid',
    value: '12345',
  });
  expect(await validate('  test  ')).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'At least five characters.',
    value: 'test',
  });
  expect(await validate('hello world')).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'At most ten characters.',
    value: 'hello world',
  });
  expect(await validate('')).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: '',
  });
  expect(await validate(new Date(0))).toEqual({
    errors: null,
    isValid: false,
    message: 'At most ten characters.',
    state: 'invalid',
    value: '1970-01-01T00:00:00.000Z',
  });
  expect(await validate(undefined)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: undefined,
  });
  expect(await validate(null)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: null,
  });
  expect(await validate({ name: 'August' })).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Failed to parse value to string.',
    value: { name: 'August' },
  });
});
