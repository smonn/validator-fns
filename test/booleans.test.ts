import { assert, test } from 'vitest';
import { boolean } from '../src/index.js';

test('boolean', async () => {
  const validate = boolean({ messages: { required: 'required' } });
  const validateWithDefault = boolean({ default: true });

  assert.deepEqual(await validate(null), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
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
  for (const input of ['true', 'false', 1, 0, {}]) {
    assert.deepEqual(await validate(input), {
      state: 'invalid',
      code: 'type',
      params: { expected: 'boolean' },
      message: 'type',
      field: undefined,
      errors: undefined,
    });
  }
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
