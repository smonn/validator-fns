import { assert, test } from 'vitest';
import {
  array,
  check,
  createValidator,
  createValidatorTest,
  invalid,
  messageTree,
  min,
  number,
  object,
  optional,
  type Result,
  string,
  valid,
  type Validator,
  withMessages,
} from '../src/index.js';

/** What a promise rejects with, or `'resolved'`. */
const rejection = async (promise: unknown) =>
  Promise.resolve(promise).then(
    () => 'resolved',
    (error: unknown) => error,
  );

test('should word a failure made without a message from the translation', async () => {
  const name = withMessages(string(min(3)), {
    min: 'At least {min}, got {value}.',
    required: ({ field }) => `${String(field)} is required.`,
  });
  assert.deepInclude(await name('ab'), {
    code: 'min',
    message: 'At least 3, got ab.',
  });
  assert.deepInclude(await name(undefined, 'name'), {
    code: 'required',
    message: 'name is required.',
  });
  assert.deepEqual(await name('abc'), {
    state: 'valid',
    value: 'abc',
    field: undefined,
  });
});

test('should keep the message passed to a test or set in the config', async () => {
  const messages = { min: 'translated', required: 'translated' };
  assert.deepInclude(await withMessages(string(min(2, 'min')), messages)('a'), {
    message: 'min',
  });
  assert.deepInclude(
    await withMessages(
      string({ messages: { required: 'config' } }, min(2)),
      messages,
    )(null),
    { message: 'config' },
  );
});

test('should leave a failure as it is when it was copied with spread', async () => {
  const short = string(min(2));
  const copied = createValidator(async (value: unknown, field?: string) => ({
    ...(await short(value, field)),
  }));
  assert.deepInclude(await withMessages(copied, { min: 'translated' })('a'), {
    code: 'min',
    message: 'min',
  });
});

test('should let an inner translation beat an outer one, which fills the rest', async () => {
  const form = withMessages(
    object({
      a: withMessages(string(min(2)), { min: 'inner' }),
      b: string(min(2)),
    }),
    { min: 'outer', required: 'outer required', properties: 'Fix the form.' },
  );
  const result = await form({ a: 'x' });
  assert.deepInclude(result, { message: 'Fix the form.' });
  assert.deepEqual(messageTree(result), { a: 'inner', b: 'outer required' });
});

test('should let an outer translation word a container whose child an inner one worded', async () => {
  const form = withMessages(
    withMessages(object({ a: string(min(2)) }), { min: 'inner' }),
    { min: 'outer', properties: 'outer' },
  );
  const result = await form({ a: 'x' });
  assert.deepInclude(result, { message: 'outer' });
  assert.deepEqual(messageTree(result), { a: 'inner' });
});

test('should keep a worded container message while wording its children', async () => {
  const form = withMessages(
    withMessages(
      object(
        { a: string(min(2)) },
        { messages: { properties: 'Fix the form.' } },
      ),
      { min: 'Too short.' },
    ),
    { properties: 'translated' },
  );
  const result = await form({ a: 'x' });
  assert.deepInclude(result, { message: 'Fix the form.' });
  assert.deepEqual(messageTree(result), { a: 'Too short.' });
});

test('should word failures nested in arrays and objects', async () => {
  const tags = withMessages(array(object({ name: string(min(2)) })), {
    min: '{field} is short.',
  });
  assert.deepEqual(messageTree(await tags([{ name: 'ok' }, { name: 'x' }])), [
    null,
    { name: '[1].name is short.' },
  ]);
});

test('should give each check() path level its own value', async () => {
  const addresses = withMessages(
    object(
      { shipping: object({ zip: string() }) },
      check(['shipping', 'zip'], () => false, 'match'),
    ),
    {
      properties: ({ value }) => JSON.stringify(value),
      match: ({ value }) => `match ${JSON.stringify(value)}`,
    },
  );
  const input = { shipping: { zip: '1' } };
  const result = await addresses(input);
  assert.deepInclude(result, { message: JSON.stringify(input) });
  assert.deepEqual(messageTree(result), {
    shipping: { zip: `match ${JSON.stringify(input)}` },
  });
  assert.deepInclude(
    result.state === 'invalid' &&
      Reflect.get(Object(result.errors), 'shipping'),
    { message: JSON.stringify(input.shipping) },
  );
});

type Billing = { billing?: { zip?: string } | null };

/** Fails every value, whatever its billing. */
const never = (value: Billing) => value === undefined;

const zipTest = check(['billing', 'zip'], never, 'match');

test.each<[string, unknown]>([
  ['undefined', undefined],
  ['null', null],
  ['an object without the key', {}],
])('should give the check() path level of %s its value', async (_, billing) => {
  const zipCheck = withMessages(
    // Reflect.apply lets the test pass billing values the types reject.
    createValidator(async (value: unknown): Promise<Result> =>
      Reflect.apply(zipTest, undefined, [value]),
    ),
    { properties: ({ value }) => `got ${String(value)}` },
  );
  const result = await zipCheck({ billing });
  const level: unknown =
    result.state === 'invalid' && Reflect.get(Object(result.errors), 'billing');
  assert.deepInclude(level, { message: `got ${String(billing)}` });
  assert.deepEqual(messageTree(result), {
    billing: { zip: 'match' },
  });
});

test('should word a custom validator failure made without a message', async () => {
  const taken = createValidator(async (value: unknown, field?: string) =>
    invalid({ code: 'taken', params: { name: 'bob' }, value, field }),
  );
  assert.deepInclude(
    await withMessages(taken, { taken: '{name} is taken: {value}' })('x'),
    { message: 'bob is taken: x' },
  );
  assert.deepInclude(await withMessages(taken, {})('x'), { message: 'taken' });
});

const plain: Validator<never> = async (value, field) =>
  invalid({ code: 'plain', value, field });

const translatedPlain = withMessages(plain, { plain: 'Plain.' });

test('should word the safe call when the validator is a plain async function', async () => {
  assert.deepInclude(await translatedPlain(1), { message: 'Plain.' });
});

test('should word ~standard issues when the validator is a plain async function', async () => {
  assert.deepEqual<unknown>(await translatedPlain['~standard'].validate(1), {
    issues: [{ message: 'Plain.', code: 'plain', params: {} }],
  });
});

test('should pass a missing value in optional() when the validator is a plain async function', async () => {
  assert.deepEqual(await optional(translatedPlain)(null), {
    state: 'valid',
    value: null,
    field: undefined,
  });
});

test.each(['constructor', 'toString', '__proto__'])(
  'should leave the code %s as it is when the translation lacks it',
  async (code) => {
    const fails = createValidatorTest<string>(code, () => false);
    assert.deepInclude(await withMessages(string(fails), {})('x'), {
      code,
      message: code,
    });
  },
);

/** A translation with an own `__proto__` key, which a literal can't make. */
const withProto = () => Object.fromEntries([['__proto__', 'Own.']]);

const bare = withProto();
Object.setPrototypeOf(bare, null);

test.each<[string, Record<string, string>]>([
  ['an own __proto__ key', withProto()],
  ['a null prototype', bare],
])('should word a code from a translation with %s', async (_, messages) => {
  const fails = createValidatorTest<string>('__proto__', () => false);
  assert.deepInclude(await withMessages(string(fails), messages)('x'), {
    message: 'Own.',
  });
});

test('should read the translation once, when it is made', async () => {
  const messages = { min: 'before' };
  const name = withMessages(string(min(2)), messages);
  messages.min = 'after';
  assert.deepInclude(await name('a'), { message: 'before' });
});

test.each<[string, unknown, string]>([
  ['undefined', undefined, '`messages` must be an object'],
  ['null', null, '`messages` must be an object'],
  ['a string', 'min', '`messages` must be an object'],
  ['a number message', { min: 1 }, '`messages.min` must be a message'],
  ['a null message', { min: null }, '`messages.min` must be a message'],
])(
  'should throw a TypeError when the translation is %s',
  (_, messages, text) => {
    assert.throws(
      // Reflect.apply lets the test pass a translation the types reject.
      () => Reflect.apply(withMessages, undefined, [string(), messages]),
      TypeError,
      text,
    );
  },
);

test('should throw a TypeError when the validator is not a function', () => {
  assert.throws(
    // Reflect.apply lets the test pass a validator the types reject.
    () => Reflect.apply(withMessages, undefined, [{}, {}]),
    TypeError,
    '`validator` must be a validator',
  );
});

test('should reject with what the validator throws', async () => {
  const bug = new Error('bug');
  const throwing: Validator = () => {
    throw bug;
  };
  assert.strictEqual(await rejection(withMessages(throwing, {})('x')), bug);
});

test('should reject with what a message function throws', async () => {
  const bug = new Error('bug');
  const name = withMessages(string(min(2)), {
    min: () => {
      throw bug;
    },
  });
  assert.strictEqual(await rejection(name('a')), bug);
});

test('should keep the result as it is when it is valid', async () => {
  const valued = createValidator(async (value: unknown, field?: string) =>
    valid({ value, field }),
  );
  assert.deepEqual(await withMessages(valued, {})(1, 'a'), {
    state: 'valid',
    value: 1,
    field: 'a',
  });
  assert.deepEqual(await withMessages(number(), {})(1), {
    state: 'valid',
    value: 1,
    field: undefined,
  });
});
