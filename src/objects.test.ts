import { integer, number } from './numbers';
import { object } from './objects';
import { max, min, required } from './shared';
import { string } from './strings';

test('object', async () => {
  const validate = object({
    username: string(
      required('Username is required.'),
      min(5, 'At least five characters.'),
      max(20, 'At most 20 characters.')
    ),
    age: number(
      required('Must enter your age.'),
      min(18, 'At least 18 years old'),
      max(150, 'Are you really over 150 years old?'),
      integer('Half-years do not count.')
    ),
  });

  expect(
    await validate({
      username: 'hello',
      age: '20',
    })
  ).toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: {
      username: 'hello',
      age: 20,
    },
  });

  expect(
    await validate({
      username: 'hello',
      age: null,
    })
  ).toEqual({
    isValid: false,
    state: 'invalid',
    field: undefined,
    message: '',
    value: {
      username: 'hello',
      age: null,
    },
    errors: {
      age: 'Must enter your age.',
    },
  });
});

test('nested object', async () => {
  // while this is technically possible, it's not recommended usage as it quickly gets quite complex
  const validate = object({
    person: object({
      firstName: string(required('required')),
      lastName: string(required('required')),
      age: number(),
    }),
  });

  expect(
    await validate({
      person: {
        firstName: 'foo',
        lastName: 'bar',
      },
    })
  ).toEqual({
    isValid: true,
    state: 'valid',
    field: undefined,
    value: {
      person: {
        firstName: 'foo',
        lastName: 'bar',
        age: undefined,
      },
    },
  });

  expect(
    await validate({
      person: {
        firstName: 'foo',
        age: '22',
      },
    })
  ).toEqual({
    isValid: false,
    state: 'invalid',
    field: undefined,
    message: '',
    value: {
      person: {
        firstName: 'foo',
        lastName: undefined,
        age: 22,
      },
    },
    errors: {
      person: {
        lastName: 'required',
      },
    },
  });
});

test('bad values', async () => {
  expect(() => object(null)).toThrow();
  expect(() => object({})).toThrow();
});
