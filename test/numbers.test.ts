import { assert, test } from 'vitest';
import {
  check,
  integer,
  max,
  min,
  number,
  optional,
  parseNumber,
} from '../src/index.js';

test('min', async () => {
  const validate = min(5, 'min:{min}');
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
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
    field: undefined,
    message: 'min:5',
    errors: undefined,
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}');
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
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
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
  assert.deepEqual(await validate(1e-1), {
    state: 'invalid',
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
});

test('number', async () => {
  const validate = number(
    { requiredMessage: 'Must enter a value.' },
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
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(-11), {
    state: 'invalid',
    message: 'Must be at least -10.',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(Number.NaN), {
    state: 'invalid',
    message: 'Must enter a value.',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(new Date(0)), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  assert.deepEqual(await validate({}), {
    state: 'invalid',
    message: 'Failed to parse value to number.',
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
    ['', Number.NaN],
    ['  ', Number.NaN],
    [new Number(3), 3],
    [new String('4'), 4],
    [new Date(5), 5],
  ];
  // Blank input parses to NaN, which only optional() accepts.
  const validate = optional(number());
  for (const [value, expected] of accepted) {
    assert.deepEqual(parseNumber(value), expected, String(expected));
    const result = await validate(value);
    assert(result.state === 'valid', String(expected));
    assert.deepEqual(result.value, expected, String(expected));
  }
});

test('number returns an invalid result for input it cannot parse', async () => {
  const rejected: [unknown, string][] = [
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
  }
});
