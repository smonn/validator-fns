import { assert, expectTypeOf, test } from 'vitest';
import {
  check,
  createValidatorTest,
  date,
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

const signup = object(
  {
    password: string(required('Required')),
    confirm: string(required('Required')),
  },
  check('confirm', (value) => value.confirm === value.password, 'Must match.'),
);

test('should put an object-level error on the named field when the check fails', async () => {
  assert.deepEqual(await signup({ password: 'secret', confirm: 'other' }), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    message: '',
    value: { password: 'secret', confirm: 'other' },
    errors: { confirm: 'Must match.' },
  });
});

test('should return the parsed object when every object-level test passes', async () => {
  assert.deepEqual(await signup({ password: 'secret', confirm: 'secret' }), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: { password: 'secret', confirm: 'secret' },
  });
});

test('should skip object-level tests when a field is invalid', async () => {
  let calls = 0;
  const validate = object(
    { password: string(required('Required')) },
    check(() => {
      calls++;
      return false;
    }, 'Never reported.'),
  );

  assert.deepEqual(await validate({}), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    message: '',
    value: {},
    errors: { password: 'Required' },
  });
  assert.strictEqual(calls, 0);
});

test('should compare parsed values when an object-level test runs', async () => {
  const validate = object(
    { start: date(), end: date() },
    check(
      'end',
      (value) => (value.end ?? 0) > (value.start ?? 0),
      'Must follow the start date.',
    ),
  );

  assert.deepInclude(
    await validate({ start: '2024-01-02', end: '2024-01-01' }),
    { state: 'invalid', errors: { end: 'Must follow the start date.' } },
  );
});

test('should put the message on the object when the check names no field', async () => {
  const validate = object(
    { min: number(), max: number() },
    check(
      (value) => (value.min ?? 0) <= (value.max ?? 0),
      '{field}: min must not exceed max.',
    ),
  );

  assert.deepEqual(await validate({ min: 3, max: 1 }, 'range'), {
    state: 'invalid',
    isValid: false,
    field: 'range',
    message: 'range: min must not exceed max.',
    value: { min: 3, max: 1 },
    errors: undefined,
  });
});

test('should nest an object-level error when the check names a path', async () => {
  const validate = object(
    {
      billing: object({ zip: string() }),
      shipping: object({ zip: string() }),
    },
    check(
      ['shipping', 'zip'],
      (value) => value.shipping?.zip === value.billing?.zip,
      'Must match the billing zip.',
    ),
  );

  assert.deepInclude(
    await validate({ billing: { zip: '12345' }, shipping: { zip: '54321' } }),
    {
      state: 'invalid',
      errors: { shipping: { zip: 'Must match the billing zip.' } },
    },
  );
});

test('should stop at the first failing object-level test', async () => {
  const validate = object(
    { name: string() },
    createValidatorTest(() => false, 'First.'),
    createValidatorTest(() => false, 'Second.'),
  );

  assert.deepInclude(await validate({ name: 'a' }), { message: 'First.' });
});

test('should type the check value as the parsed object when used in object()', () => {
  object(
    { password: string(), age: number() },
    check((value) => {
      expectTypeOf(value).toEqualTypeOf<{ password?: string; age?: number }>();
      return true;
    }, 'message'),
  );
});
