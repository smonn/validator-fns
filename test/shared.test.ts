import { assert, test } from 'vitest';
import {
  exact,
  invalid,
  min,
  number,
  oneOf,
  string,
  valid,
} from '../src/index.js';

test('format string message', async () => {
  const result = await invalid({
    code: 'custom',
    message: 'Hello {name}!',
    value: '',
    field: undefined,
    params: { name: 'World' },
  });

  assert.deepInclude(result, { message: 'Hello World!' });
});

test('format function message', async () => {
  const result = await invalid({
    code: 'custom',
    message: ({ name }: { name: string }) => `Hello ${name}!`,
    value: '',
    field: undefined,
    params: { name: 'World' },
  });

  assert.deepInclude(result, { message: 'Hello World!' });
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
    code: 'exact',
    params: { exact: 5, amount: 3 },
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
    code: 'exact',
    params: { exact: 5, amount: 4 },
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
    code: 'exact',
    params: { exact: 5, amount: 2 },
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
    code: 'oneOf',
    params: { values: ['foo', 'bar', 'baz'] },
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
  const result = oneOf<string>(['a'], 'oneOf')('b');
  assert.instanceOf(result, Promise);
  assert.strictEqual((await result).state, 'invalid');
});

test('should stop at a custom test when it fails between built-in tests', async () => {
  const validate = string(
    min(1, 'min'),
    async (value, field) =>
      invalid({ code: 'custom', message: 'custom', value, field }),
    min(10, 'min'),
  );

  assert.deepInclude(await validate('abc'), {
    state: 'invalid',
    message: 'custom',
  });
});
