import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  integer,
  max,
  min,
  number,
  parseNumber,
  required,
} from '../src/index.js';

test('min', async () => {
  const validate = min(5, 'min:{min}', true);
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    value: Number.NaN,
    isValid: false,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
    value: 0,
    isValid: false,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    isValid: true,
    value: null,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(5.01), {
    state: 'valid',
    isValid: true,
    value: 5.01,
    field: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'invalid',
    isValid: false,
    value: 5,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(4.99), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    message: 'min:5',
    value: 4.99,
    errors: undefined,
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}', true);
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    value: Number.NaN,
    isValid: false,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(5.01), {
    state: 'invalid',
    value: 5.01,
    isValid: false,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'invalid',
    value: 5,
    isValid: false,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(4.99), {
    state: 'valid',
    value: 4.99,
    isValid: true,
    field: undefined,
  });
});

test('integer', async () => {
  const validate = integer('integer');
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    value: Number.NaN,
    message: 'integer',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(0.1), {
    state: 'invalid',
    value: 0.1,
    isValid: false,
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
  assert.deepEqual(await validate(1e-1), {
    state: 'invalid',
    value: 1e-1,
    isValid: false,
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
});

test('number', async () => {
  const validate = number(
    required('Must enter a value.'),
    min(-10, 'Must be at least -10.'),
    max(10, 'Must be at most 10.'),
  );

  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(-10), {
    state: 'valid',
    value: -10,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(10), {
    state: 'valid',
    value: 10,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(11), {
    state: 'invalid',
    message: 'Must be at most 10.',
    value: 11,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(-11), {
    state: 'invalid',
    message: 'Must be at least -10.',
    value: -11,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: Number.NaN,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(new Date(0)), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: null,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate({}), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: Number.NaN,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
});

test('rounding', async () => {
  const nearest = number({ round: 'nearest' });
  const floor = number({ round: 'floor' });
  const ceil = number({ round: 'ceil' });
  const badRounding = number({ round: 'bad' as 'nearest' });

  assert.deepEqual(await nearest(0.9), {
    value: 1,
    isValid: true,
    state: 'valid',
    field: undefined,
  });
  assert.deepEqual(await floor(0.9), {
    value: 0,
    isValid: true,
    state: 'valid',
    field: undefined,
  });
  assert.deepEqual(await ceil(0.1), {
    value: 1,
    isValid: true,
    state: 'valid',
    field: undefined,
  });
  assert.deepEqual(await badRounding(1), {
    errors: undefined,
    value: 1,
    isValid: false,
    state: 'invalid',
    message: 'Unknown round type: bad',
    field: undefined,
  });
});

test('number default', async () => {
  const validate = number({ default: 5 });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: 5,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: 5,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(Number.NaN), {
    state: 'valid',
    value: 5,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(123), {
    state: 'valid',
    value: 123,
    isValid: true,
    field: undefined,
  });
});

// Pins today's coercion of non-primitive input. #579 changes it in v3 to
// return an invalid result instead.
test('number coerces non-primitive input through its string form', async () => {
  const coerced: [unknown, number][] = [
    [[1], 1],
    [[[1, 2]], 1],
    [1n, 1],
    [new Number(3), 3],
    [[], Number.NaN],
    [['a', 'b'], Number.NaN],
    [{}, Number.NaN],
    [new Map(), Number.NaN],
    [Symbol('s'), Number.NaN],
    [true, Number.NaN],
    [() => 1, Number.NaN],
  ];
  const validate = number();
  for (const [value, expected] of coerced) {
    assert.deepEqual(parseNumber(value), expected, String(expected));
    assert.deepEqual(
      await validate(value),
      { state: 'valid', isValid: true, field: undefined, value: expected },
      String(expected),
    );
  }

  const nullPrototype: unknown = Object.create(null);
  assert.throws(
    () => parseNumber(nullPrototype),
    TypeError,
    'Cannot convert object to primitive value',
  );
  assert.deepEqual(await validate(nullPrototype), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    value: nullPrototype as number,
    message: 'Cannot convert object to primitive value',
    errors: undefined,
  });
});

test('should read the time when number() gets a date from another realm', async () => {
  assert.equal((await number()(runInNewContext('new Date(5)'))).value, 5);
});

test('should read the time when number() gets a date with its own getTime and valueOf', async () => {
  const date = new Date(5);
  Object.defineProperty(date, 'getTime', { value: () => 1000 });
  Object.defineProperty(date, 'valueOf', { value: () => 1000 });
  assert.equal((await number()(date)).value, 5);
});
