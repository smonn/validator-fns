import { formatMessage, required } from './shared';

test('format string message', () => {
  expect(formatMessage('Hello {name}!', { name: 'World' })).toBe(
    'Hello World!'
  );
});

test('format function message', () => {
  expect(formatMessage(({ name }) => `Hello ${name}!`, { name: 'World' })).toBe(
    'Hello World!'
  );
});

test('required', async () => {
  const validate = required('required');
  expect(await validate('hello')).toMatchObject({ isValid: true });
  expect(await validate(true)).toMatchObject({ isValid: true });
  expect(await validate(false)).toMatchObject({ isValid: true });
  expect(await validate(0)).toMatchObject({ isValid: true });
  expect(await validate('')).toMatchObject({ isValid: false });
  expect(await validate(null)).toMatchObject({ isValid: false });
  expect(await validate(undefined)).toMatchObject({ isValid: false });

  const nullableValidate = required('required', true);
  expect(await nullableValidate(null)).toMatchObject({ isValid: true });
});
