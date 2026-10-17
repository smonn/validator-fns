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
      isValid: true,
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
      isValid: false,
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
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: {},
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: {},
    isValid: true,
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
    isValid: true,
    field: undefined,
  });
});

test('should report a field as missing when its name is on Object.prototype', async () => {
  const validate = object({
    constructor: string(required('Required')),
    toString: string(required('Required')),
  });

  assert.deepEqual(await validate({}), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    message: '',
    value: {},
    errors: { constructor: 'Required', toString: 'Required' },
  });
});

test('should report a field as missing when the input only inherits it', async () => {
  const input = Object.create({ name: 'inherited' }) as object;
  const validate = object({ name: string(required('Required')) });

  assert.deepEqual(await validate(input), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    message: '',
    value: input,
    errors: { name: 'Required' },
  });
});

test('should keep a __proto__ field as an own property when it is in the schema', async () => {
  const validate = object(
    Object.fromEntries([['__proto__', string(required('Required'))]]),
  );

  const validResult = await validate(JSON.parse('{"__proto__": "x"}'));
  assert.equal(validResult.state, 'valid');
  assert.deepEqual(Object.getOwnPropertyNames(validResult.value), [
    '__proto__',
  ]);
  assert.equal(Reflect.get(validResult.value ?? {}, '__proto__'), 'x');

  const invalidResult = await validate(JSON.parse('{"__proto__": null}'));
  assert.equal(invalidResult.state, 'invalid');
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(
      (invalidResult.state === 'invalid' && invalidResult.errors) || {},
      '__proto__',
    )?.value,
    'Required',
  );
});

test('should not change the prototype of the value when a __proto__ field is an object', async () => {
  const validate = object(
    Object.fromEntries([['__proto__', object({ admin: string() })]]),
  );

  const result = await validate(JSON.parse('{"__proto__": {"admin": "yes"}}'));

  assert.equal(Object.getPrototypeOf(result.value), Object.prototype);
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(result.value, '__proto__')?.value,
    { admin: 'yes' },
  );
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
      isValid: true,
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
      isValid: false,
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
