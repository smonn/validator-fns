// How withMessages() walks an errors tree: the trees the decoders reject,
// shared, frozen, deep and cyclic ones.
import { assert, test } from 'vitest';
import {
  createValidator,
  invalid,
  messageTree,
  min,
  object,
  type Result,
  string,
  type Validator,
  withMessages,
} from '../src/index.js';

/** What a promise rejects with, or `'resolved'`. */
const rejection = async (promise: unknown) =>
  Promise.resolve(promise).then(
    () => 'resolved',
    (error: unknown) => error,
  );

// JSON.parse makes a result the types reject.
const bogus: Validator = async () => JSON.parse('{ "state": "invalid" }');

test('should reject with a TypeError when the result is not a failure', async () => {
  const error = await rejection(withMessages(bogus, {})('x'));
  assert.instanceOf(error, TypeError);
  assert.include(String(error), "A validator's result isn't a failure");
});

test('should reject with a TypeError for an errors tree with 1000001 entries', async () => {
  const flat = createValidator(async () =>
    invalid({
      code: 'items',
      field: undefined,
      errors: Array.from({ length: 1_000_001 }, () => null),
    }),
  );
  const error = await rejection(withMessages(flat, {})({}));
  assert.instanceOf(error, TypeError);
  assert.include(String(error), 'more than 1000000 entries');
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
    // An unhandled rejection is reported after the microtasks drain.
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
