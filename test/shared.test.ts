import { assert, test } from 'vitest';
import { exact, formatMessage, oneOf, required, string } from '../src/index.js';

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
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(true), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(false), {
    state: 'valid',
    value: false,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  const now = new Date();
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    value: '',
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    value: null,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    value: undefined,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  const invalidDate = new Date('');
  assert.deepEqual(await validate(invalidDate), {
    state: 'invalid',
    value: invalidDate,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });

  const nullableValidate = required('required', true);
  assert.deepEqual(await nullableValidate(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
});

test('exact', async () => {
  const validate = exact(5, 'exact:{exact}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('foo'), {
    state: 'invalid',
    value: 'foo',
    message: 'exact:5',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(5), {
    state: 'valid',
    value: 5,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(4), {
    state: 'invalid',
    value: 4,
    message: 'exact:5',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(Array.from({ length: 5 })), {
    state: 'valid',
    value: [undefined, undefined, undefined, undefined, undefined],
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(Array.from({ length: 2 })), {
    state: 'invalid',
    value: [undefined, undefined],
    message: 'exact:5',
    isValid: false,
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
    value: 'asdf' as 'foo',
    message: 'oneOf:foo,bar,baz',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  const numbers = oneOf([2, 4, 6], 'oneOf:{values}');
  assert.deepEqual(await numbers(4), {
    state: 'valid',
    value: 4,
    isValid: true,
    field: undefined,
  });
  const booleans = oneOf([false], 'oneOf:{values}');
  assert.deepEqual(await booleans(false), {
    state: 'valid',
    value: false,
    isValid: true,
    field: undefined,
  });
  const tsEnums = oneOf(
    [TestValue.One, TestValue.Two, TestValue.Three],
    'oneOf:{values}',
  );
  assert.deepEqual(await tsEnums(TestValue.Three), {
    state: 'valid',
    value: TestValue.Three,
    isValid: true,
    field: undefined,
  });
  const dates = oneOf([new Date(0), new Date(1)], 'oneOf:{values}');
  assert.deepEqual(await dates(new Date(0)), {
    state: 'valid',
    value: new Date(0),
    isValid: true,
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
    isValid: false,
    message: 'some error',
    value: 'hello',
    field: undefined,
    errors: undefined,
  });
});
