import { assert, test } from 'vitest';
import { check, integer, max, min, number, optional } from '../src/index.js';

test('min', async () => {
  const validate = min(5, 'min:{min}');
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    code: 'min',
    params: { min: 5, amount: Number.NaN },
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
    code: 'min',
    params: { min: 5, amount: 0 },
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(5.01), {
    state: 'valid',
    value: 5.01,
    field: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'valid',
    value: 5,
    field: undefined,
  });
  assert.deepEqual(await validate(4.99), {
    state: 'invalid',
    code: 'min',
    params: { min: 5, amount: 4.99 },
    field: undefined,
    message: 'min:5',
    errors: undefined,
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}');
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    code: 'max',
    params: { max: 5, amount: Number.NaN },
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate(5.01), {
    state: 'invalid',
    code: 'max',
    params: { max: 5, amount: 5.01 },
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'valid',
    value: 5,
    field: undefined,
  });
  assert.deepEqual(await validate(4.99), {
    state: 'valid',
    value: 4.99,
    field: undefined,
  });
});

test('integer', async () => {
  const validate = integer('integer');
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    code: 'integer',
    params: {},
    message: 'integer',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate(0.1), {
    state: 'invalid',
    code: 'integer',
    params: {},
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
  assert.deepEqual(await validate(1e-1), {
    state: 'invalid',
    code: 'integer',
    params: {},
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
});

test('number', async () => {
  const validate = number(
    { messages: { required: 'Must enter a value.' } },
    min(-10, 'Must be at least -10.'),
    max(10, 'Must be at most 10.'),
  );

  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate(-10), {
    state: 'valid',
    value: -10,
    field: undefined,
  });
  assert.deepEqual(await validate(10), {
    state: 'valid',
    value: 10,
    field: undefined,
  });
  assert.deepEqual(await validate(11), {
    state: 'invalid',
    code: 'max',
    params: { max: 10, amount: 11 },
    message: 'Must be at most 10.',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(-11), {
    state: 'invalid',
    code: 'min',
    params: { min: -10, amount: -11 },
    message: 'Must be at least -10.',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'Must enter a value.',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate({}), {
    state: 'invalid',
    code: 'type',
    params: { expected: 'number' },
    message: 'type',
    errors: undefined,
    field: undefined,
  });
});

test('should write a strict bound with check()', async () => {
  const validate = number(check((value: number) => value > 0, 'positive'));

  assert.deepInclude(await validate(0), {
    state: 'invalid',
    message: 'positive',
  });
  assert.deepInclude(await validate(0.1), { state: 'valid', value: 0.1 });
});

test('number default', async () => {
  const validate = number({ default: 5 });
  assert.deepEqual(await validate(undefined), {
    state: 'valid',
    value: 5,
    field: undefined,
  });
  assert.deepEqual(await validate(123), {
    state: 'valid',
    value: 123,
    field: undefined,
  });
});

test('number fails anything but a finite number, inside optional() too', async () => {
  const rejected: [unknown, string][] = [
    ['1.5', 'numeric string'],
    ['', 'empty string'],
    ['  ', 'blank string'],
    [Number.NaN, 'NaN'],
    [Infinity, 'Infinity'],
    [1n, 'bigint'],
    [new Number(3), 'Number object'],
    [new String('4'), 'String object holding a number'],
    [new Date(5), 'date'],
    [[1], 'array'],
    [[[1, 2]], 'nested array'],
    [[], 'empty array'],
    [{}, 'plain object'],
    [Object.create(null), 'null-prototype object'],
    [new Map(), 'Map'],
    [() => 1, 'function'],
    [Symbol('s'), 'symbol'],
    ['abc', 'unparseable string'],
    ['NaN', 'the string NaN'],
    [true, 'boolean'],
    [new String('x'), 'String object holding an unparseable string'],
  ];
  for (const validate of [number(), optional(number())]) {
    for (const [value, label] of rejected) {
      const result = await validate(value);
      assert.equal(result.state, 'invalid', label);
      assert.equal(result.state === 'invalid' && result.message, 'type', label);
    }
  }
});
