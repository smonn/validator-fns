import { array } from './arrays';
import { object } from './objects';
import { max, min, required } from './shared';
import { string } from './strings';

test('array', async () => {
  const validate = array(string(min(3, 'min:{min}')), required('required'));

  expect(await validate(['foo', 'bar', 'baz'])).toMatchObject({
    isValid: true,
  });
  expect(await validate(null)).toMatchObject({
    isValid: false,
    result: {
      isValid: false,
      message: 'required',
    },
  });
  expect(await validate(undefined)).toMatchObject({
    isValid: false,
    result: {
      isValid: false,
      message: 'required',
    },
  });
  expect(await validate([])).toMatchObject({
    isValid: true,
  });
  expect(await validate(['foo', 'ba'])).toMatchObject({
    isValid: false,
    itemResults: [
      {
        isValid: true,
        value: 'foo',
      },
      {
        isValid: false,
        message: 'min:3',
        value: 'ba',
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

  expect(await validate([{}, { username: 'foo' }])).toMatchObject({
    isValid: false,
    itemResults: [
      {
        isValid: false,
        field: '[0]',
        value: {},
        results: {
          username: {
            isValid: false,
          },
        },
      },
      {
        isValid: true,
        field: '[1]',
        value: {
          username: 'foo',
        },
      },
    ],
  });
});
