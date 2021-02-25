import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { boolean, required } from '../src';

test('boolean', async () => {
  const validate = boolean(required('required'));
  const validateWithDefault = boolean({ default: true });

  assert.equal(await validate(null), {
    state: 'invalid',
    message: 'required',
    value: null,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(undefined), {
    state: 'invalid',
    message: 'required',
    value: undefined,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(true), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(false), {
    state: 'valid',
    value: false,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate('true'), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate('false'), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(1), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(0), {
    state: 'valid',
    value: false,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate({}), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validateWithDefault(undefined), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validateWithDefault(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
});

test.run();
