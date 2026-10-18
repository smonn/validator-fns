import { runInNewContext } from 'node:vm';
import { assert, expectTypeOf, test } from 'vitest';
import {
  type ExtractError,
  type Failure,
  FailureError,
  invalid,
  min,
  object,
  parse,
  string,
  type Validator,
} from '../src/index.js';

/** What the promise rejects with, or `'resolved'`. */
const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => error,
  );

const user = object({ name: string({ trim: true }, min(2)) });

test('should resolve to the parsed value when the input is valid', async () => {
  assert.deepEqual(await parse(user, { name: ' ab ' }), { name: 'ab' });
});

test('should reject with a FailureError carrying the safe call failure when the input is invalid', async () => {
  const error = await rejection(parse(user, { name: 'x' }, 'user'));

  assert.instanceOf(error, FailureError);
  assert.instanceOf(error, Error);
  assert.deepEqual<unknown>(error.failure, await user({ name: 'x' }, 'user'));
  assert.strictEqual(error.name, 'FailureError');
  assert.strictEqual(error.message, 'user.name: min');
  assert.include(error.stack, 'FailureError: user.name: min');
});

test('should type the value and the failure from the validator', async () => {
  const made = await user({});
  assert(made.state === 'invalid');

  expectTypeOf(() => parse(user, {})).returns.toEqualTypeOf<
    Promise<{ name: string }>
  >();
  expectTypeOf(new FailureError(made).failure).toEqualTypeOf<
    Failure<ExtractError<typeof user>>
  >();
});

test('should make a FailureError from a hand-made failure', async () => {
  const made = await invalid({
    code: 'taken',
    message: 'Taken.',
    field: 'email',
  });
  assert(made.state === 'invalid');
  const error = new FailureError(made);

  assert.strictEqual(error.failure, made);
  assert.strictEqual(error.message, 'email: Taken.');
});

const even: Validator<number> = async (value, field) =>
  typeof value === 'number' && value % 2 === 0
    ? { state: 'valid', value, field }
    : invalid({ code: 'even', message: 'Must be even.', field });

test('should resolve to the value when a plain async function passes it', async () => {
  assert.strictEqual(await parse(even, 2), 2);
});

test('should reject with a FailureError when a plain async function fails', async () => {
  assert.strictEqual(
    String(await rejection(parse(even, 3, 'n'))),
    'FailureError: n: Must be even.',
  );
});

/** A validator from another realm that resolves to `source`. */
const foreign = (source: string): Validator =>
  runInNewContext(`async () => (${source})`);

test('should resolve to the value when a valid result is from another realm', async () => {
  assert.strictEqual(
    await parse(foreign("{ state: 'valid', value: 1 }"), null),
    1,
  );
});

test('should reject with a FailureError when a failure is from another realm', async () => {
  const error = await rejection(
    parse(
      foreign(
        "{ state: 'invalid', code: 'items', params: {}, message: 'items', field: 'list', errors: [null, { state: 'invalid', code: 'min', params: {}, message: 'min', field: 'list[1]' }] }",
      ),
      null,
    ),
  );
  assert.instanceOf(error, FailureError);
  assert.strictEqual(error.message, 'list[1]: min');
});

// [label, a validator that throws, the thrown value]
test.each<[string, Validator, unknown]>([
  [
    'a synchronous throw',
    () => {
      throw 'bug';
    },
    'bug',
  ],
  ['a rejection with null', async () => Promise.reject(null), null],
  [
    'a rejection from another realm',
    runInNewContext('async () => { throw undefined; }'),
    undefined,
  ],
])(
  'should reject with the thrown value unwrapped for %s',
  async (_, bad, thrown) => {
    assert.strictEqual(await rejection(parse(bad, 'a')), thrown);
  },
);

// A validator that resolves to something other than an object has a bug. The
// errors tree table covers objects that aren't a result.
test.each(['undefined', 'null'])(
  'should throw a TypeError when a validator resolves to %s',
  async (made) => {
    const error = await rejection(parse(foreign(made), 'a'));
    assert.instanceOf(error, TypeError);
    assert.notInstanceOf(error, FailureError);
  },
);
