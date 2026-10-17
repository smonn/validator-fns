import { assert, test } from 'vitest';
import {
  exact,
  formatMessage,
  number,
  oneOf,
  required,
  string,
  valid,
} from '../src/index.js';

test('format string message', () => {
  assert.strictEqual(
    formatMessage('Hello {name}!', {
      name: 'World',
      value: '',
      field: undefined,
    }),
    'Hello World!',
  );
});

test('format function message', () => {
  assert.strictEqual(
    formatMessage(({ name }) => `Hello ${name}!`, {
      name: 'World',
      value: '',
      field: undefined,
    }),
    'Hello World!',
  );
});

test('required', async () => {
  const validate = required('required');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    field: undefined,
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
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    field: undefined,
  });
  const now = new Date();
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    value: '',
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    value: null,
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    value: undefined,
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  const invalidDate = new Date('');
  assert.deepEqual(await validate(invalidDate), {
    state: 'invalid',
    value: invalidDate,
    message: 'required',
    field: undefined,
    errors: undefined,
  });

  const nullableValidate = required('required', true);
  assert.deepEqual(await nullableValidate(null), {
    state: 'valid',
    value: null,
    field: undefined,
  });
});

test('exact', async () => {
  const validate = exact(5, 'exact:{exact}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    field: undefined,
  });
  assert.deepEqual(await validate('foo'), {
    state: 'invalid',
    value: 'foo',
    message: 'exact:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'valid',
    value: 5,
    field: undefined,
  });
  assert.deepEqual(await validate(4), {
    state: 'invalid',
    value: 4,
    message: 'exact:5',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(Array.from({ length: 5 })), {
    state: 'valid',
    value: [undefined, undefined, undefined, undefined, undefined],
    field: undefined,
  });
  assert.deepEqual(await validate(Array.from({ length: 2 })), {
    state: 'invalid',
    value: [undefined, undefined],
    message: 'exact:5',
    field: undefined,
    errors: undefined,
  });
});

enum TestValue {
  One,
  Two,
  Three,
}

test('enums', async () => {
  const strings = oneOf(['foo', 'bar', 'baz'], 'oneOf:{values}');
  assert.deepEqual(await strings('asdf'), {
    state: 'invalid',
    value: 'asdf',
    message: 'oneOf:foo,bar,baz',
    field: undefined,
    errors: undefined,
  });
  const numbers = oneOf([2, 4, 6], 'oneOf:{values}');
  assert.deepEqual(await numbers(4), {
    state: 'valid',
    value: 4,
    field: undefined,
  });
  const booleans = oneOf([false], 'oneOf:{values}');
  assert.deepEqual(await booleans(false), {
    state: 'valid',
    value: false,
    field: undefined,
  });
  const tsEnums = oneOf(
    [TestValue.One, TestValue.Two, TestValue.Three],
    'oneOf:{values}',
  );
  assert.deepEqual(await tsEnums(TestValue.Three), {
    state: 'valid',
    value: TestValue.Three,
    field: undefined,
  });
  const dates = oneOf([new Date(0), new Date(1)], 'oneOf:{values}');
  assert.deepEqual(await dates(new Date(0)), {
    state: 'valid',
    value: new Date(0),
    field: undefined,
  });
});

test('custom test that throws an atypical error', async () => {
  const validate = string(() => {
    throw 'some error';
  });

  const result = await validate('hello');
  assert.deepEqual(result, {
    state: 'invalid',
    message: 'some error',
    value: 'hello',
    field: undefined,
    errors: undefined,
  });
});

test('should return the field of each call when the same value repeats', async () => {
  const validate = number();
  await validate(1, 'first');
  assert.strictEqual((await validate(1, 'second')).field, 'second');
});

test('should run custom tests on every call when the same value repeats', async () => {
  let calls = 0;
  const validate = string(async (value, field) => {
    calls++;
    return valid({ value, field });
  });
  await validate('a');
  await validate('a');
  assert.strictEqual(calls, 2);
});
