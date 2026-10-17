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
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
    value: 0,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: null,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(5.01), {
    state: 'valid',
    value: 5.01,
    field: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'invalid',
    value: 5,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(4.99), {
    state: 'invalid',
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
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: null,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(5.01), {
    state: 'invalid',
    value: 5.01,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'invalid',
    value: 5,
    message: 'max:5',
    field: undefined,
    errors: undefined,
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
    value: Number.NaN,
    message: 'integer',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: null,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(0.1), {
    state: 'invalid',
    value: 0.1,
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
  assert.deepEqual(await validate(1e-1), {
    state: 'invalid',
    value: 1e-1,
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
    message: 'Must be at most 10.',
    value: 11,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(-11), {
    state: 'invalid',
    message: 'Must be at least -10.',
    value: -11,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: Number.NaN,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(new Date(0)), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: null,
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate({}), {
    state: 'invalid',
    message: 'Failed to parse value to number.',
    value: {},
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
    state: 'valid',
    field: undefined,
  });
  assert.deepEqual(await floor(0.9), {
    value: 0,
    state: 'valid',
    field: undefined,
  });
  assert.deepEqual(await ceil(0.1), {
    value: 1,
    state: 'valid',
    field: undefined,
  });
  assert.deepEqual(await badRounding(1), {
    errors: undefined,
    value: 1,
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
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: 5,
    field: undefined,
  });
  assert.deepEqual(await validate(Number.NaN), {
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

test('number accepts primitives, dates, and boxed primitives', async () => {
  const accepted: [unknown, number][] = [
    ['1.5', 1.5],
    [1n, 1],
    [true, Number.NaN],
    [new Number(3), 3],
    [new String('4'), 4],
    [new Date(5), 5],
  ];
  const validate = number();
  for (const [value, expected] of accepted) {
    assert.deepEqual(parseNumber(value), expected, String(expected));
    const result = await validate(value);
    assert.equal(result.state, 'valid', String(expected));
    assert.deepEqual(result.value, expected, String(expected));
  }
});

test('number returns an invalid result for non-primitive and symbol input', async () => {
  const rejected: [unknown, string][] = [
    [[1], 'array'],
    [[[1, 2]], 'nested array'],
    [[], 'empty array'],
    [{}, 'plain object'],
    [Object.create(null), 'null-prototype object'],
    [new Map(), 'Map'],
    [() => 1, 'function'],
    [Symbol('s'), 'symbol'],
  ];
  const validate = number();
  for (const [value, label] of rejected) {
    assert.throws(
      () => parseNumber(value),
      TypeError,
      'Failed to parse value to number.',
      label,
    );
    const result = await validate(value);
    assert.equal(result.state, 'invalid', label);
    assert.equal(
      result.state === 'invalid' && result.message,
      'Failed to parse value to number.',
      label,
    );
    assert.equal(result.value, value, label);
  }
});
