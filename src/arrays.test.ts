import { array } from './arrays';
import { object } from './objects';
import { max, min, required } from './shared';
import { string } from './strings';

test('array', async () => {
  const validate = array(
    string(min(3, 'min:{min}')),
    required('required'),
    min(1, 'min:{min}')
  );

  await expect(validate(['foo', 'bar', 'baz'])).resolves.toEqual({
    isValid: true,
    state: 'valid',
    value: ['foo', 'bar', 'baz'],
  });
  await expect(validate(null)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    value: null,
    message: 'required',
    errors: [],
  });
  await expect(validate(undefined)).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    value: undefined,
    message: 'required',
    errors: [],
  });
  await expect(validate([])).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    value: [],
    message: 'min:1',
    errors: [],
  });
  await expect(validate({} as unknown[])).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    value: [],
    message: 'min:1',
    errors: [],
  });
  await expect(validate(['foo', 'ba'])).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    value: ['foo', 'ba'],
    message: '',
    errors: [
      {
        errors: null,
        message: 'min:3',
        index: 1,
      },
    ],
  });
});

test('array with object', async () => {
  const validate = array(
    object({
      username: string(required('required'), min(3, 'min:{min}')),
    }),
    min(2, 'min:{min}'),
    max(10, 'max:{max}')
  );

  await expect(
    validate([{}, { username: 'foo' }, { username: 'ab' }])
  ).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    value: [{}, { username: 'foo' }, { username: 'ab' }],
    message: '',
    errors: [
      {
        index: 0,
        message: '',
        errors: {
          username: 'required',
        },
      },
      {
        index: 2,
        message: '',
        errors: {
          username: 'min:3',
        },
      },
    ],
  });
});

test('nested array', async () => {
  // while this is technically possible, it's not recommended usage as it quickly gets quite complex
  const validate = array(array(string(required('required'))));
  await expect(validate([['', 'foo', null]])).resolves.toEqual({
    isValid: false,
    state: 'invalid',
    message: '',
    value: [['', 'foo', null]],
    errors: [
      {
        index: 0,
        message: '',
        errors: [
          {
            errors: null,
            index: 0,
            message: 'required',
          },
          {
            errors: null,
            index: 2,
            message: 'required',
          },
        ],
      },
    ],
  });
});
