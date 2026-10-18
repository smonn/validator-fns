import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  exact,
  formatMessage,
  invalid,
  min,
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
    value: 'asdf',
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

test('should return a promise when a built-in test is called directly', async () => {
  const result = required('required')('');
  assert.instanceOf(result, Promise);
  assert.strictEqual((await result).state, 'invalid');
});

test('should stop at a custom test when it fails between built-in tests', async () => {
  const validate = string(
    required('required'),
    async (value, field) => invalid({ message: 'custom', value, field }),
    min(10, 'min'),
  );

  assert.deepInclude(await validate('abc'), {
    state: 'invalid',
    message: 'custom',
  });
});

test('should return an invalid result when a built-in test message throws', async () => {
  const validate = string(
    required(() => {
      throw new Error('boom');
    }),
  );

  assert.deepInclude(await validate(''), { state: 'invalid', message: 'boom' });
});

test('should fail required when the value is an invalid date from another realm', async () => {
  const validate = required('required');
  assert.equal(
    (await validate(runInNewContext('new Date(Number.NaN)'))).state,
    'invalid',
  );
  assert.equal((await validate(runInNewContext('new Date(0)'))).state, 'valid');
});

test('should fail required when the value is an invalid date with its own valueOf', async () => {
  const broken = new Date(Number.NaN);
  Object.defineProperty(broken, 'valueOf', { value: () => 0 });
  assert.equal((await required('required')(broken)).state, 'invalid');
});

test('should match a listed date when oneOf gets a date from another realm', async () => {
  assert.equal(
    (await oneOf([new Date(0)], 'oneOf')(runInNewContext('new Date(0)'))).state,
    'valid',
  );
  assert.equal(
    (await oneOf([runInNewContext('new Date(0)')], 'oneOf')(new Date(0))).state,
    'valid',
  );
});

test('should match a listed number when oneOf gets a date with that time', async () => {
  assert.equal((await oneOf([1000], 'oneOf')(new Date(1000))).state, 'valid');
});

test('should compare the time when oneOf gets a date with its own getTime and valueOf', async () => {
  const date = new Date(0);
  Object.defineProperty(date, 'getTime', { value: () => 1000 });
  Object.defineProperty(date, 'valueOf', { value: () => 1000 });
  assert.equal((await oneOf([new Date(1000)], 'oneOf')(date)).state, 'invalid');
  assert.equal((await oneOf([new Date(0)], 'oneOf')(date)).state, 'valid');
});

test('should fail required when the value is an invalid date from another realm with another toStringTag', async () => {
  const relabeled: unknown = runInNewContext(
    'Object.defineProperty(new Date(Number.NaN), Symbol.toStringTag, { value: "Other" })',
  );
  assert.equal((await required('required')(relabeled)).state, 'invalid');
});
