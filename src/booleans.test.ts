import { boolean } from './booleans';
import { required } from './shared';

test('boolean', async () => {
  const validate = boolean(required('required'));

  await expect(validate(null)).resolves.toEqual({
    isValid: false,
    field: undefined,
    message: 'required',
    value: null,
  });
  await expect(validate(undefined)).resolves.toEqual({
    isValid: false,
    field: undefined,
    message: 'required',
    value: undefined,
  });
  await expect(validate(true)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: true,
  });
  await expect(validate(false)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: false,
  });
  await expect(validate('true')).resolves.toEqual({
    isValid: true,
    value: true,
    field: undefined,
  });
  await expect(validate('false')).resolves.toEqual({
    isValid: true,
    value: true,
    field: undefined,
  });
  await expect(validate(1)).resolves.toEqual({
    isValid: true,
    value: true,
    field: undefined,
  });
  await expect(validate(0)).resolves.toEqual({
    isValid: true,
    value: false,
    field: undefined,
  });
  await expect(validate({})).resolves.toEqual({
    isValid: true,
    value: true,
    field: undefined,
  });
});
