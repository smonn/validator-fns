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

test('should leave a failure copied with spread as it is', async () => {
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

test('should take a plain async function as the validator', async () => {
  const translated = withMessages(plain, { plain: 'Plain.' });
  assert.deepInclude(await translated(1), { message: 'Plain.' });
  assert.deepEqual<unknown>(await translated['~standard'].validate(1), {
    issues: [{ message: 'Plain.', code: 'plain', params: {} }],
  });
  assert.deepEqual(await optional(translated)(null), {
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

/** A translation with an own `__proto__` key and no prototype. */
const bare = Object.fromEntries([['__proto__', 'Own.']]);
Object.setPrototypeOf(bare, null);

test.each<[string, Record<string, string>]>([
  ['an own __proto__ key', JSON.parse('{ "__proto__": "Own." }')],
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
      () => Reflect.apply(withMessages, undefined, [string(), messages]),
      TypeError,
      text,
    );
  },
);

test('should throw a TypeError when the validator is not a function', () => {
  assert.throws(
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

test('should word a frozen failure without changing it', async () => {
  const leaf = Object.freeze(await invalid({ code: 'min', field: 'a' }));
  const frozen = Object.freeze(
    await invalid({
      code: 'properties',
      field: undefined,
      errors: { a: leaf },
    }),
  );
  const result = await withMessages(
    createValidator(async () => frozen),
    { min: 'Too short.', properties: 'Fix it.' },
  )({});
  assert.deepInclude(result, { message: 'Fix it.' });
  assert.deepEqual<unknown>(messageTree(result), { a: 'Too short.' });
  assert.deepInclude(frozen, { message: 'properties' });
  assert.deepInclude(leaf, { message: 'min' });
});

test('should keep a failure and its tree as they are when nothing is worded', async () => {
  const made = await invalid({
    code: 'properties',
    field: undefined,
    errors: { a: await invalid({ code: 'min', field: 'a' }) },
  });
  const result = await withMessages(
    createValidator(async () => made),
    {},
  )({});
  assert.strictEqual(result, made);
});

/** A validator whose failure shares each level's child under two keys. */
const doubling = (levels: number) =>
  createValidator(async () => {
    let made: Result = await invalid({ code: 'min', field: undefined });
    for (let level = 0; level < levels; level++) {
      made = await invalid({
        code: 'properties',
        field: undefined,
        errors: { a: made, b: made },
      });
    }
    return made;
  });

test('should word a shared failure once for all its references', async () => {
  const result = await withMessages(doubling(40), { min: 'Too short.' })({});
  let made: unknown = result;
  for (let level = 0; level < 40; level++) {
    const errors: unknown = Reflect.get(Object(made), 'errors');
    assert.strictEqual(
      Reflect.get(Object(errors), 'a'),
      Reflect.get(Object(errors), 'b'),
    );
    made = Reflect.get(Object(errors), 'a');
  }
  assert.deepInclude(made, { code: 'min', message: 'Too short.' });
});

/** A validator whose failure nests `levels` `properties` failures above a leaf. */
const nested = (levels: number) =>
  createValidator(async () => {
    let made: Result = await invalid({ code: 'min', field: undefined });
    for (let level = 0; level < levels; level++) {
      made = await invalid({
        code: 'properties',
        field: undefined,
        errors: { a: made },
      });
    }
    return made;
  });

test('should word an errors tree 1000 levels deep', async () => {
  const result = await withMessages(nested(1000), { min: 'Too short.' })({});
  let made: unknown = result;
  for (let level = 0; level < 1000; level++) {
    made = Reflect.get(Object(Reflect.get(Object(made), 'errors')), 'a');
  }
  assert.deepInclude(made, { message: 'Too short.' });
});

test.each([1001, 100_000])(
  'should reject with a TypeError for an errors tree %i levels deep',
  async (levels) => {
    const error = await rejection(
      withMessages(nested(levels), { min: 'Too short.' })({}),
    );
    assert.instanceOf(error, TypeError);
    assert.include(String(error), 'deeper than 1000 levels');
  },
);

test('should reject with a TypeError for a cyclic errors tree', async () => {
  const errors: { a?: unknown } = {};
  const cyclic = await invalid({
    code: 'properties',
    field: undefined,
    errors,
  });
  errors.a = cyclic;
  const error = await rejection(
    withMessages(
      createValidator(async () => cyclic),
      {},
    )({}),
  );
  assert.instanceOf(error, TypeError);
  assert.include(String(error), 'deeper than 1000 levels');
});

/** An `object()` schema nested `levels` deep, with a string at the bottom. */
const deepSchema = (levels: number): Validator => {
  let schema: Validator = string(min(2));
  for (let level = 0; level < levels; level++) {
    schema = object({ a: schema });
  }
  return schema;
};

/** Input nested `levels` deep in `a`, with a short string at the bottom. */
const deepInput = (levels: number): unknown => {
  let input: unknown = 'x';
  for (let level = 0; level < levels; level++) {
    input = { a: input };
  }
  return input;
};

test('should word a deep object() failure synchronously', async () => {
  const result = await withMessages(deepSchema(300), { min: 'Too short.' })(
    deepInput(300),
  );
  let made: unknown = result;
  for (let level = 0; level < 300; level++) {
    made = Reflect.get(Object(Reflect.get(Object(made), 'errors')), 'a');
  }
  assert.deepInclude(made, { message: 'Too short.' });
});

// Awaiting before it recurses, the schema nests past the fill's 1000 levels.
const node: Validator = createValidator(async (value, field) => {
  await Promise.resolve();
  return recursive(value, field);
});
const recursive = object({ a: node });

test('should reject once and leave no unhandled rejection for input too deep to word', async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const translated = withMessages(recursive, { type: 'Not an object.' });
    assert.deepInclude(await recursive(deepInput(1200)), {
      code: 'properties',
    });
    const error = await rejection(translated(deepInput(1200)));
    assert.instanceOf(error, TypeError);
    assert.include(String(error), 'deeper than 1000 levels');
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
test('should keep a valid result as it is', async () => {
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
