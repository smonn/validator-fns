import { assert, test } from 'vitest';
import {
  exact,
  formatMessage,
  isObject,
  invalid,
  min,
  number,
  oneOf,
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

test('exact', async () => {
  const validate = exact(5, 'exact:{exact}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    field: undefined,
  });
  assert.deepEqual(await validate('foo'), {
    state: 'invalid',
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
  const strings = oneOf<string>(['foo', 'bar', 'baz'], 'oneOf:{values}');
  assert.deepEqual(await strings('asdf'), {
    state: 'invalid',
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

test('isObject is true only for objects tagged Object', () => {
  class Point {
    x = 1;
  }
  for (const value of [{}, Object.create(null), new Point()]) {
    assert.isTrue(isObject(value));
  }
  const others: [unknown, string][] = [
    [[], 'array'],
    [null, 'null'],
    [undefined, 'undefined'],
    [new Map(), 'Map'],
    ['x', 'string'],
    [1, 'number'],
  ];
  for (const [value, label] of others) {
    assert.isFalse(isObject(value), label);
  }
});

test('should return a promise when a built-in test is called directly', async () => {
  const result = oneOf<string>(['a'], 'oneOf')('b');
  assert.instanceOf(result, Promise);
  assert.strictEqual((await result).state, 'invalid');
});

test('should stop at a custom test when it fails between built-in tests', async () => {
  const validate = string(
    min(1, 'min'),
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
    min(5, () => {
      throw new Error('boom');
    }),
  );

  assert.deepInclude(await validate('abc'), {
    state: 'invalid',
    message: 'boom',
  });
});
