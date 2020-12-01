import { formatMessage, required, exact } from './shared';

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
  await expect(validate('hello')).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: 'hello',
  });
  await expect(validate(true)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: true,
  });
  await expect(validate(false)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: false,
  });
  await expect(validate(0)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: 0,
  });
  const now = new Date();
  await expect(validate(now)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: now,
  });
  await expect(validate('')).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: '',
    message: 'required',
  });
  await expect(validate(null)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: null,
    message: 'required',
  });
  await expect(validate(undefined)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: undefined,
    message: 'required',
  });
  const invalidDate = new Date('');
  await expect(validate(invalidDate)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: invalidDate,
    message: 'required',
  });

  const nullableValidate = required('required', true);
  await expect(nullableValidate(null)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: null,
  });
});

test('exact', async () => {
  const validate = exact(5, 'exact:{exact}');
  await expect(validate('hello')).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: 'hello',
  });
  await expect(validate('foo')).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: 'foo',
    message: 'exact:5',
  });
  await expect(validate(5)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: 5,
  });
  await expect(validate(4)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: 4,
    message: 'exact:5',
  });
  await expect(validate(Array(5))).resolves.toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: [undefined, undefined, undefined, undefined, undefined],
  });
  await expect(validate(Array(2))).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    field: undefined,
    value: [undefined, undefined],
    message: 'exact:5',
  });
});
