import { boolean } from './booleans';
import { required } from './shared';

test('boolean', async () => {
  const validate = boolean(required('required'));
  const validateWithDefault = boolean({ default: true });

  await expect(validate(null)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'required',
    value: null,
  });
  await expect(validate(undefined)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'required',
    value: undefined,
  });
  await expect(validate(true)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: true,
  });
  await expect(validate(false)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: false,
  });
  await expect(validate('true')).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: true,
  });
  await expect(validate('false')).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: true,
  });
  await expect(validate(1)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: true,
  });
  await expect(validate(0)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: false,
  });
  await expect(validate({})).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: true,
  });
  await expect(validateWithDefault(undefined)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: true,
  });
  await expect(validateWithDefault(null)).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: null,
  });
});
