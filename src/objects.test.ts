import { integer, max, min, number } from './numbers';
import { object } from './objects';
import { required } from './shared';
import { maxLength, minLength, string } from './strings';

test('object', async () => {
  const validate = object({
    username: string(
      required('Username is required.'),
      minLength(5, 'At least five characters.'),
      maxLength(20, 'At most 20 characters.')
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
    value: {
      username: 'hello',
      age: 20,
    },
    results: {
      username: {
        isValid: true,
        value: 'hello',
        field: 'username',
      },
      age: {
        isValid: true,
        value: 20,
        field: 'age',
      },
    },
  });

  expect(
    await validate({
      username: 'hello',
    })
  ).toEqual({
    isValid: false,
    value: {
      username: 'hello',
      age: undefined,
    },
    results: {
      username: {
        isValid: true,
        value: 'hello',
        field: 'username',
      },
      age: {
        message: 'Must enter your age.',
        isValid: false,
        field: 'age',
        value: undefined,
      },
    },
  });
});

test('nested object', async () => {
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
  ).toMatchObject({
    isValid: true,
    value: {
      person: {
        firstName: 'foo',
        lastName: 'bar',
        age: undefined,
      },
    },
    results: {
      person: {
        results: {
          firstName: {
            value: 'foo',
          },
          lastName: {
            value: 'bar',
          },
          age: {
            value: undefined,
          },
        },
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
  ).toMatchObject({
    isValid: false,
    value: {
      person: {
        firstName: 'foo',
        lastName: undefined,
        age: 22,
      },
    },
    results: {
      person: {
        results: {
          firstName: {
            value: 'foo',
          },
          lastName: {
            value: undefined,
            message: 'required',
          },
          age: {
            value: 22,
          },
        },
      },
    },
  });
});
