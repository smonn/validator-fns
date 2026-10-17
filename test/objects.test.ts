import { assert, test } from 'vitest';
import {
  integer,
  max,
  min,
  number,
  object,
  required,
  string,
  type ValidatorTest,
} from '../src/index.js';

test('object', async () => {
  const validate = object({
    username: string(
      required('Username is required.'),
      min(5, 'At least five characters.'),
      max(20, 'At most 20 characters.'),
    ),
    age: number(
      required('Must enter your age.'),
      min(18, 'At least 18 years old'),
      max(150, 'Are you really over 150 years old?'),
      integer('Half-years do not count.'),
    ),
  });

  assert.deepEqual(
    await validate({
      username: 'hello',
      age: '20',
    }),
    {
      state: 'valid',
      value: {
        username: 'hello',
        age: 20,
      },
      field: undefined,
    },
  );

  assert.deepEqual(
    await validate({
      username: 'hello',
      age: null,
    }),
    {
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
    },
  );
});

test('empty object config is always valid', async () => {
  const validate = object({});

  assert.deepEqual(await validate({ foo: 'bar' }), {
    state: 'valid',
    value: {},
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: {},
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: {},
    field: undefined,
  });
});

test('inherited properties of the config are not validated', async () => {
  const inherited = { name: string(required('required')) };
  const properties = Object.assign(Object.create(inherited) as object, {
    age: number(),
  });
  const validate = object(properties);

  assert.deepEqual(await validate({ name: undefined, age: 22 }), {
    state: 'valid',
    value: { age: 22 },
    field: undefined,
  });
});

test('nested object', async () => {
  // While this is technically possible, it's not recommended usage as it quickly gets quite complex
  const validate = object({
    person: object({
      firstName: string(required('required')),
      lastName: string(required('required')),
      age: number(),
    }),
  });

  assert.deepEqual(
    await validate({
      person: {
        firstName: 'foo',
        lastName: 'bar',
      },
    }),
    {
      state: 'valid',
      value: {
        person: {
          firstName: 'foo',
          lastName: 'bar',
          age: undefined as unknown as number,
        },
      },
      field: undefined,
    },
  );

  assert.deepEqual(
    await validate({
      person: {
        firstName: 'foo',
        age: '22',
      },
    }),
    {
      state: 'invalid',
      message: '',
      value: {
        person: {
          firstName: 'foo',
          age: '22',
        },
      },
      errors: {
        person: {
          lastName: 'required',
        },
      },
      field: undefined,
    },
  );
});

test('invalid configuration', async () => {
  const config: Record<string, ValidatorTest> = 'bad value' as any as Record<
    string,
    ValidatorTest
  >;
  assert.throws(() => object(config));

  const validate = object({ test: 'test' } as any);
  await validate(null);
});
