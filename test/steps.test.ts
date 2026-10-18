import { assert, test } from 'vitest';
import {
  array,
  check,
  createTypeValidator,
  max,
  messageTree,
  min,
  number,
  object,
  optional,
  string,
  transform,
  valid,
} from '../src/index.js';

// Hand-written tests, which have no synchronous twin.
const double = async (value: number, field?: string) =>
  valid({ value: value * 2, field });
const shout = async (value: string, field?: string) =>
  valid({ value: value.toUpperCase(), field });

test('a test passes its valid value to the next test', async () => {
  const validate = number(double, max(10, 'max'));

  assert.deepInclude(await validate(6), {
    state: 'invalid',
    code: 'max',
    params: { max: 10, amount: 12 },
  });
  assert.deepEqual(await validate(4), {
    state: 'valid',
    value: 8,
    field: undefined,
  });
});

test('the last test value is the result value', async () => {
  assert.deepEqual(await string(min(1), shout)('abc', 'name'), {
    state: 'valid',
    value: 'ABC',
    field: 'name',
  });
  assert.deepInclude(await optional(number(double, double))(3), {
    state: 'valid',
    value: 12,
  });
});

const custom = createTypeValidator(async (value: unknown, field?: string) =>
  valid({ value, field }),
);
const wrap = async (value: unknown, field?: string) =>
  valid({ value: [value], field });

test('a custom type validator passes values on the same way', async () => {
  assert.deepInclude(await custom(wrap, wrap)('a'), { value: [['a']] });
});

test('an object test passes its valid value to the next object test', async () => {
  const validate = object(
    { count: number() },
    async (value, field) => valid({ value: { count: value.count + 1 }, field }),
    check('count', (value) => value.count < 3, 'tooMany'),
  );

  assert.deepInclude(await validate({ count: 1 }), {
    state: 'valid',
    value: { count: 2 },
  });
  const failed = await validate({ count: 2 });
  assert.deepInclude(failed, { state: 'invalid', code: 'properties' });
  assert.deepEqual(messageTree(failed), { count: 'tooMany' });
});

test('~standard.validate returns the value after the tests', async () => {
  assert.deepEqual(await string(shout)['~standard'].validate('a'), {
    value: 'A',
  });
  const upper = string(transform((value) => value.toUpperCase()));
  assert.deepEqual(await upper['~standard'].validate('a'), { value: 'A' });
});

const trimmed = string(
  transform((value) => value.trim()),
  min(2, 'min'),
);

test('transform() changes the value for the next test', async () => {
  for (const blank of ['  ', ' a ']) {
    assert.deepInclude(await trimmed(blank), { state: 'invalid', code: 'min' });
  }
  assert.deepEqual(await trimmed(' ab ', 'name'), {
    state: 'valid',
    value: 'ab',
    field: 'name',
  });
});

test('a transformed value is never missing, inside optional() too', async () => {
  assert.deepInclude(await optional(trimmed)('  '), {
    state: 'invalid',
    code: 'min',
    params: { min: 2, amount: 0 },
  });
});

test('transform() makes a test that never fails', async () => {
  const negate = transform((value: number) => -value);

  assert.deepEqual(await negate(2, 'n'), {
    state: 'valid',
    value: -2,
    field: 'n',
  });
  const tenfold = object(
    { count: number() },
    transform(({ count }) => ({ count: count * 10 })),
  );

  assert.deepInclude(await tenfold({ count: 2 }), {
    state: 'valid',
    value: { count: 20 },
  });
});

test('an array length check sees the input array, not an earlier test value', async () => {
  const validate = array(
    number(),
    transform(() => [1, 2]),
    min(2, 'min'),
  );

  assert.deepInclude(await validate([1]), {
    state: 'invalid',
    code: 'min',
    params: { min: 2, amount: 1 },
  });
});
