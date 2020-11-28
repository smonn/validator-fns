import { array } from './arrays';
import { object } from './objects';
import { max, min, required } from './shared';
import { string } from './strings';

test('array', async () => {
  const validate = array(string(min(3, 'min:{min}')), required('required'));

  await expect(validate(['foo', 'bar', 'baz'])).resolves.toEqual({
    isValid: true,
    value: ['foo', 'bar', 'baz'],
  });
  await expect(validate(null)).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: null,
    message: 'required',
    errors: [],
  });
  await expect(validate(undefined)).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: undefined,
    message: 'required',
    errors: [],
  });
  await expect(validate([])).resolves.toEqual({
    isValid: true,
    value: [],
    field: undefined,
  });
  await expect(validate(['foo', 'ba'])).resolves.toEqual({
    isValid: false,
    value: ['foo', 'ba'],
    message: '',
    field: undefined,
    errors: [
      {
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
    field: undefined,
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
    message: '',
    value: [['', 'foo', null]],
    field: undefined,
    errors: [
      {
        index: 0,
        message: '',
        errors: [
          {
            errors: undefined,
            index: 0,
            message: 'required',
          },
          {
            errors: undefined,
            index: 2,
            message: 'required',
          },
        ],
      },
    ],
  });
});
