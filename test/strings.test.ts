import { max, min, required } from '../src/shared';
import { email, string, url } from '../src/strings';

test('min', async () => {
  const validate = min(5, 'min:{min}');
  expect(await validate('hello')).toMatchObject({ state: 'valid' });
  expect(await validate('')).toMatchObject({ state: 'valid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate('foo')).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'min:5',
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}');
  expect(await validate('hello')).toMatchObject({ state: 'valid' });
  expect(await validate('')).toMatchObject({ state: 'valid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate('foo bar')).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'max:5',
  });
});

test('email', async () => {
  const validate = email('invalid email');
  expect(await validate('name@example.com')).toMatchObject({ state: 'valid' });
  expect(await validate('name@host')).toMatchObject({ state: 'valid' });
  expect(await validate('name+tag@example.com')).toMatchObject({
    state: 'valid',
  });
  expect(await validate('')).toMatchObject({ state: 'valid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate('@example.com')).toMatchObject({ state: 'invalid' });
  expect(await validate('name.com')).toMatchObject({ state: 'invalid' });
  expect(await validate('name@.com')).toMatchObject({ state: 'invalid' });
});

test('url', async () => {
  const validate = url('invalid url', ['http:', 'mailto:', 'https:']);
  expect(await validate('http://example.com')).toMatchObject({
    state: 'valid',
  });
  expect(await validate('mailto:name@example.com')).toMatchObject({
    state: 'valid',
  });
  expect(await validate('')).toMatchObject({ state: 'valid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate('/foo')).toMatchObject({ state: 'invalid' });
  expect(await validate('unknown://path')).toMatchObject({
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

  expect(await validate('hello')).toMatchObject({
    state: 'valid',
    value: 'hello',
  });
  expect(await validate(12345)).toMatchObject({
    state: 'valid',
    value: '12345',
  });
  expect(await validate('  test  ')).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'At least five characters.',
    value: 'test',
  });
  expect(await validate('hello world')).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'At most ten characters.',
    value: 'hello world',
  });
  expect(await validate('')).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: '',
  });
  expect(await validate(new Date(0))).toMatchObject({
    errors: null,
    state: 'invalid',
    message: 'At most ten characters.',
    value: '1970-01-01T00:00:00.000Z',
  });
  expect(await validate(undefined)).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: undefined,
  });
  expect(await validate(null)).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: null,
  });
  expect(await validate({ name: 'August' })).toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'Failed to parse value to string.',
    value: { name: 'August' },
  });
});
