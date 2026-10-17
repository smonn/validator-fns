import { assert, test } from 'vitest';
import { boolean } from '../src/index.js';

test('boolean', async () => {
  const validate = boolean({ requiredMessage: 'required' });
  const validateWithDefault = boolean({ default: true });

  assert.deepEqual(await validate(null), {
    state: 'invalid',
    message: 'required',
    value: null,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'required',
    value: undefined,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(true), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validate(false), {
    state: 'valid',
    value: false,
    field: undefined,
  });
  assert.deepEqual(await validate('true'), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validate('false'), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validate(1), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: false,
    field: undefined,
  });
  assert.deepEqual(await validate({}), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validateWithDefault(), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validateWithDefault(null), {
    state: 'valid',
    value: true,
    field: undefined,
  });
  assert.deepEqual(await validateWithDefault(false), {
    state: 'valid',
    value: false,
    field: undefined,
  });
});
