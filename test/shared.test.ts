import { assert, test } from 'vitest';
import { invalid, number, oneOf, string, valid } from '../src/index.js';

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
