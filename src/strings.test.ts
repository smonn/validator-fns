import { required } from './shared';
import { email, maxLength, minLength, string, url } from './strings';

test('minLength', async () => {
  const validate = minLength(5, 'min:{min}');
  expect(await validate('hello')).toMatchObject({ isValid: true });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('foo')).toMatchObject({
    isValid: false,
    message: 'min:5',
  });
});

test('maxLength', async () => {
  const validate = maxLength(5, 'max:{max}');
  expect(await validate('hello')).toMatchObject({ isValid: true });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('foo bar')).toMatchObject({
    isValid: false,
    message: 'max:5',
  });
});

test('email', async () => {
  const validate = email('invalid email');
  expect(await validate('name@example.com')).toMatchObject({ isValid: true });
  expect(await validate('name@host')).toMatchObject({ isValid: true });
  expect(await validate('name+tag@example.com')).toMatchObject({
    isValid: true,
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
  });
  expect(await validate('')).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate('/foo')).toMatchObject({ isValid: false });
  expect(await validate('javascript:void(0);')).toMatchObject({
    isValid: false,
  });
});

test('string', async () => {
  const validate = string(
    { trim: true },
    required('Must enter a value.'),
    minLength(5, 'At least five characters.'),
    maxLength(10, 'At most ten characters.')
  );

  expect(await validate('hello')).toEqual({
    isValid: true,
    value: 'hello',
  });
  expect(await validate('  test  ')).toEqual({
    isValid: false,
    message: 'At least five characters.',
    value: 'test',
  });
  expect(await validate('hello world')).toEqual({
    isValid: false,
    message: 'At most ten characters.',
    value: 'hello world',
  });
  expect(await validate('')).toEqual({
    isValid: false,
    message: 'Must enter a value.',
    value: '',
  });
  expect(await validate(undefined)).toEqual({
    isValid: false,
    message: 'Must enter a value.',
    value: undefined,
  });
  expect(await validate(null)).toEqual({
    isValid: false,
    message: 'Must enter a value.',
    value: null,
  });
});
