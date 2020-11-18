import { boolean } from './booleans';
import { required } from './shared';

test('boolean', async () => {
  const validate = boolean(required('required'));

  expect(await validate(null)).toMatchObject({ isValid: false });
  expect(await validate(undefined)).toMatchObject({ isValid: false });
  expect(await validate(true)).toMatchObject({ isValid: true });
  expect(await validate(false)).toMatchObject({ isValid: true });
  expect(await validate('true')).toMatchObject({ isValid: true, value: true });
  expect(await validate('false')).toMatchObject({ isValid: true, value: true });
  expect(await validate(1)).toMatchObject({ isValid: true, value: true });
  expect(await validate(0)).toMatchObject({ isValid: true, value: false });
  expect(await validate({})).toMatchObject({ isValid: true, value: true });
});
