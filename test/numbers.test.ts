import {test} from 'uvu';
import * as assert from 'uvu/assert';
import {integer, max, min, number, required} from '../src/index';

test('min', async () => {
  const validate = min(5, 'min:{min}', true);
  assert.equal(await validate(Number.NaN), {
    state: 'invalid',
    value: Number.NaN,
    isValid: false,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(0), {
    state: 'invalid',
    value: 0,
    isValid: false,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(null), {
    state: 'valid',
    isValid: true,
    value: null,
    field: undefined,
  });
  assert.equal(await validate(undefined), {
    state: 'valid',
    isValid: true,
    value: undefined,
    field: undefined,
  });
  assert.equal(await validate(5.01), {
    state: 'valid',
    isValid: true,
    value: 5.01,
    field: undefined,
  });
  assert.equal(await validate(5), {
    state: 'invalid',
    isValid: false,
    value: 5,
    message: 'min:5',
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(4.99), {
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
  assert.equal(await validate(Number.NaN), {
    state: 'invalid',
    value: Number.NaN,
    isValid: false,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(undefined), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(5.01), {
    state: 'invalid',
    value: 5.01,
    isValid: false,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(5), {
    state: 'invalid',
    value: 5,
    isValid: false,
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(4.99), {
    state: 'valid',
    value: 4.99,
    isValid: true,
    field: undefined,
  });
});

test('integer', async () => {
  const validate = integer('integer');
  assert.equal(await validate(Number.NaN), {
    state: 'invalid',
    value: Number.NaN,
    message: 'integer',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(undefined), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(0.1), {
    state: 'invalid',
    value: 0.1,
    isValid: false,
    field: undefined,
    message: 'integer',
    errors: undefined,
  });
  assert.equal(await validate(1e-1), {
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

  assert.equal(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(-10), {
    state: 'valid',
    value: -10,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(10), {
    state: 'valid',
    value: 10,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(11), {
    state: 'invalid',
    message: 'Must be at most 10.',
    value: 11,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.equal(await validate(-11), {
    state: 'invalid',
    message: 'Must be at least -10.',
    value: -11,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.equal(await validate(Number.NaN), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: Number.NaN,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.equal(await validate(new Date(0)), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(undefined), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.equal(await validate(null), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: null,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
  assert.equal(await validate({}), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: Number.NaN,
    isValid: false,
    errors: undefined,
    field: undefined,
  });
});

test('rounding', async () => {
  const nearest = number({round: 'nearest'});
  const floor = number({round: 'floor'});
  const ceil = number({round: 'ceil'});
  const badRounding = number({round: 'bad' as 'nearest'});

  assert.equal(await nearest(0.9), {
    value: 1,
    isValid: true,
    state: 'valid',
    field: undefined,
  });
  assert.equal(await floor(0.9), {
    value: 0,
    isValid: true,
    state: 'valid',
    field: undefined,
  });
  assert.equal(await ceil(0.1), {
    value: 1,
    isValid: true,
    state: 'valid',
    field: undefined,
  });
  assert.equal(await badRounding(1), {
    errors: undefined,
    value: 1,
    isValid: false,
    state: 'invalid',
    message: 'Unknown round type: bad',
    field: undefined,
  });
});

test('number default', async () => {
  const validate = number({default: 5});
  assert.equal(await validate(undefined), {
    state: 'valid',
    value: 5,
    isValid: true,
    field: undefined,
  });
});

test.run();
