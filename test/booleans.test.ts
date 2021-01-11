import { boolean } from '../src/booleans';
import { required } from '../src/shared';

test('boolean', async () => {
  const validate = boolean(required('required'));
  const validateWithDefault = boolean({ default: true });

  await expect(validate(null)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'required',
    value: null,
  });
  await expect(validate(undefined)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    message: 'required',
    value: undefined,
  });
  await expect(validate(true)).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validate(false)).resolves.toMatchObject({
    state: 'valid',
    value: false,
  });
  await expect(validate('true')).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validate('false')).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validate(1)).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validate(0)).resolves.toMatchObject({
    state: 'valid',
    value: false,
  });
  await expect(validate({})).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validateWithDefault(undefined)).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validateWithDefault(null)).resolves.toMatchObject({
    state: 'valid',
    value: null,
  });
});
