import { assert, expectTypeOf, test } from 'vitest';
import {
  array,
  check,
  createValidator,
  type Failure,
  FailureError,
  invalid,
  max,
  messageTree,
  min,
  type Result,
  object,
  parse,
  string,
  type TypeValidator,
  valid,
  type Validator,
} from '../src/index.js';

/** A failure as the safe call returns it. */
function failed(
  code: string,
  field: string | undefined,
  extra: {
    params?: Record<string, unknown>;
    message?: string;
    errors?: unknown;
  } = {},
): Failure<unknown> {
  const { params = {}, message = code, errors } = extra;
  return { state: 'invalid', code, params, message, field, errors };
}

const items = (field: string | undefined, errors: unknown[]) =>
  failed('items', field, { errors });

const properties = (field: string | undefined, errors: object) =>
  failed('properties', field, { errors });

const tooShort = (field: string) =>
  failed('min', field, { params: { min: 2, amount: 1 } });

/** An object with an own `__proto__` key, which a literal can't make. */
const withProto = <V>(value: V): Record<string, V> =>
  Object.fromEntries([['__proto__', value]]);

const user = object({
  a: object({ b: string(min(2)) }),
  tags: array(object({ name: string(min(2)) })),
});

const addresses = object(
  { billing: object({ zip: string() }), shipping: object({ zip: string() }) },
  check(
    ['shipping', 'zip'],
    (value) => value.shipping.zip === value.billing.zip,
    'match',
    '{field} must match the billing zip.',
  ),
);

const signup = object(
  { password: string(), confirm: string() },
  check(
    'confirm',
    (value) => value.confirm === value.password,
    'match',
    'Must match.',
  ),
);

const hello = createValidator(async (value: unknown, field?: string) =>
  value === 'hello'
    ? valid({ value, field })
    : invalid({
        code: 'hello',
        message: 'Must be "hello".',
        value,
        field,
        errors: { count: 1 },
      }),
);

const silent = createValidator(async (value: unknown, field?: string) =>
  invalid({ code: 'custom', message: '', value, field }),
);

/** A custom container failure with the message `Empty.` and `errors`. */
const emptyContainer = (code: 'items' | 'properties', errors: object) =>
  createValidator(async (value: unknown, field?: string) =>
    invalid({ code, message: 'Empty.', value, field, errors }),
  );

const noTags = createValidator(async (value: unknown, field?: string) =>
  invalid({
    code: 'items',
    message: 'Need tags.',
    value,
    field,
    errors: [null],
  }),
);

type Row = {
  label: string;
  validator: TypeValidator<unknown, unknown>;
  input: unknown;
  field?: string;
  /** The safe call's failure, called with `field`. */
  failure: Failure<unknown>;
  /** `~standard.validate` takes no field, so `{field}` reads the path alone. */
  issues: object[];
  /** `messageTree()` of the safe call's failure. */
  messages: unknown;
  /** The message of the `FailureError` that `parse()` rejects with. */
  error: string;
};

const rows: Row[] = [
  {
    label: 'nested objects and arrays with a caller field',
    validator: user,
    input: { a: { b: 'x' }, tags: [{ name: 'ok' }, { name: 'x' }] },
    field: 'user',
    failure: properties('user', {
      a: properties('user.a', { b: tooShort('user.a.b') }),
      tags: items('user.tags', [
        null,
        properties('user.tags[1]', { name: tooShort('user.tags[1].name') }),
      ]),
    }),
    issues: [
      {
        message: 'min',
        code: 'min',
        params: { min: 2, amount: 1 },
        path: ['a', 'b'],
      },
      {
        message: 'min',
        code: 'min',
        params: { min: 2, amount: 1 },
        path: ['tags', 1, 'name'],
      },
    ],
    messages: { a: { b: 'min' }, tags: [null, { name: 'min' }] },
    error: 'user.a.b: min\nuser.tags[1].name: min',
  },
  {
    label: 'nested objects and arrays without a field',
    validator: user,
    input: { a: { b: 'x' }, tags: [{ name: 'x' }] },
    failure: properties(undefined, {
      a: properties('a', { b: tooShort('a.b') }),
      tags: items('tags', [
        properties('tags[0]', { name: tooShort('tags[0].name') }),
      ]),
    }),
    issues: [
      {
        message: 'min',
        code: 'min',
        params: { min: 2, amount: 1 },
        path: ['a', 'b'],
      },
      {
        message: 'min',
        code: 'min',
        params: { min: 2, amount: 1 },
        path: ['tags', 0, 'name'],
      },
    ],
    messages: { a: { b: 'min' }, tags: [{ name: 'min' }] },
    error: 'a.b: min\ntags[0].name: min',
  },
  {
    label: 'a root array without a field',
    validator: array(object({ name: string(min(2)) })),
    input: [{ name: 'ok' }, { name: 'x' }],
    failure: items(undefined, [
      null,
      properties('[1]', { name: tooShort('[1].name') }),
    ]),
    issues: [
      {
        message: 'min',
        code: 'min',
        params: { min: 2, amount: 1 },
        path: [1, 'name'],
      },
    ],
    messages: [null, { name: 'min' }],
    error: '[1].name: min',
  },
  {
    label: 'nested arrays with a caller field',
    validator: array(array(string())),
    input: [['a', null]],
    field: 'grid',
    failure: items('grid', [
      items('grid[0]', [null, failed('required', 'grid[0][1]')]),
    ]),
    issues: [
      { message: 'required', code: 'required', params: {}, path: [0, 1] },
    ],
    messages: [[null, 'required']],
    error: 'grid[0][1]: required',
  },
  {
    label: 'a {field} template in a nested message',
    validator: object({
      a: object({
        b: string({ messages: { required: '{field} is required.' } }),
      }),
    }),
    input: { a: {} },
    field: 'user',
    failure: properties('user', {
      a: properties('user.a', {
        b: failed('required', 'user.a.b', { message: 'user.a.b is required.' }),
      }),
    }),
    issues: [
      {
        message: 'a.b is required.',
        code: 'required',
        params: {},
        path: ['a', 'b'],
      },
    ],
    messages: { a: { b: 'user.a.b is required.' } },
    error: 'user.a.b: user.a.b is required.',
  },
  {
    label: 'a leaf failure at the root',
    validator: string(min(2)),
    input: 'x',
    field: 'name',
    failure: tooShort('name'),
    issues: [{ message: 'min', code: 'min', params: { min: 2, amount: 1 } }],
    messages: 'min',
    error: 'name: min',
  },
  {
    label: 'an array test failure, a leaf even when items fail',
    validator: array(string(min(2)), max(2, 'At most two.')),
    input: ['a', 'bb', 'c'],
    field: 'tags',
    failure: failed('max', 'tags', {
      params: { max: 2, amount: 3 },
      message: 'At most two.',
    }),
    issues: [
      { message: 'At most two.', code: 'max', params: { max: 2, amount: 3 } },
    ],
    messages: 'At most two.',
    error: 'tags: At most two.',
  },
  {
    label: 'check() with a key',
    validator: signup,
    input: { password: 'a', confirm: 'b' },
    field: 'signup',
    failure: properties('signup', {
      confirm: failed('match', 'signup.confirm', { message: 'Must match.' }),
    }),
    issues: [
      { message: 'Must match.', code: 'match', params: {}, path: ['confirm'] },
    ],
    messages: { confirm: 'Must match.' },
    error: 'signup.confirm: Must match.',
  },
  {
    label: 'check() with a path',
    validator: addresses,
    input: { billing: { zip: '1' }, shipping: { zip: '2' } },
    field: 'order',
    failure: properties('order', {
      shipping: properties('order.shipping', {
        zip: failed('match', 'order.shipping.zip', {
          message: 'order.shipping.zip must match the billing zip.',
        }),
      }),
    }),
    issues: [
      {
        message: 'shipping.zip must match the billing zip.',
        code: 'match',
        params: {},
        path: ['shipping', 'zip'],
      },
    ],
    messages: {
      shipping: { zip: 'order.shipping.zip must match the billing zip.' },
    },
    error: 'order.shipping.zip: order.shipping.zip must match the billing zip.',
  },
  {
    label: 'check() without a path',
    validator: object(
      { name: string() },
      check(() => false, 'never', 'Never passes.'),
    ),
    input: { name: 'a' },
    field: 'form',
    failure: failed('never', 'form', { message: 'Never passes.' }),
    issues: [{ message: 'Never passes.', code: 'never', params: {} }],
    messages: 'Never passes.',
    error: 'form: Never passes.',
  },
  {
    label: 'a __proto__ key',
    validator: object(withProto(object({ admin: string() }))),
    input: JSON.parse('{"__proto__": {}}'),
    failure: properties(
      undefined,
      withProto(
        properties('__proto__', {
          admin: failed('required', '__proto__.admin'),
        }),
      ),
    ),
    issues: [
      {
        message: 'required',
        code: 'required',
        params: {},
        path: ['__proto__', 'admin'],
      },
    ],
    messages: withProto({ admin: 'required' }),
    error: '__proto__.admin: required',
  },
  {
    label: 'keys named like Object.prototype members',
    validator: object({ constructor: string(), toString: array(string()) }),
    input: { toString: [null] },
    field: 'form',
    failure: properties('form', {
      constructor: failed('required', 'form.constructor'),
      toString: items('form.toString', [
        failed('required', 'form.toString[0]'),
      ]),
    }),
    issues: [
      {
        message: 'required',
        code: 'required',
        params: {},
        path: ['constructor'],
      },
      {
        message: 'required',
        code: 'required',
        params: {},
        path: ['toString', 0],
      },
    ],
    messages: { constructor: 'required', toString: ['required'] },
    error: 'form.constructor: required\nform.toString[0]: required',
  },
  {
    label: 'a custom failure with its own errors, a leaf',
    validator: object({ hello }),
    input: { hello: 'hi' },
    failure: properties(undefined, {
      hello: failed('hello', 'hello', {
        message: 'Must be "hello".',
        errors: { count: 1 },
      }),
    }),
    issues: [
      {
        message: 'Must be "hello".',
        code: 'hello',
        params: {},
        path: ['hello'],
      },
    ],
    messages: { hello: 'Must be "hello".' },
    error: 'hello: Must be "hello".',
  },
  {
    label: 'a child that fails with an empty message',
    validator: array(silent),
    input: ['a'],
    failure: items(undefined, [failed('custom', '[0]', { message: '' })]),
    issues: [{ message: '', code: 'custom', params: {}, path: [0] }],
    messages: [''],
    error: '[0]: ',
  },
  {
    label: 'an items failure without errors, a leaf',
    validator: createValidator(async (value: unknown, field?: string) =>
      invalid({ code: 'items', message: 'No items.', value, field }),
    ),
    input: [],
    failure: failed('items', undefined, { message: 'No items.' }),
    issues: [{ message: 'No items.', code: 'items', params: {} }],
    messages: 'No items.',
    error: 'No items.',
  },
  {
    label: 'a container whose errors hold no failure',
    validator: createValidator(async (value: unknown, field?: string) =>
      invalid({ code: 'items', value, field, errors: [null] }),
    ),
    input: [1],
    failure: items(undefined, [null]),
    issues: [{ message: 'items', code: 'items', params: {} }],
    messages: [null],
    error: 'items',
  },
  {
    label: 'a nested container whose tree holds no failure',
    validator: object({ tags: noTags, name: string(min(2)) }),
    input: { name: 'x' },
    failure: properties(undefined, {
      tags: failed('items', 'tags', { message: 'Need tags.', errors: [null] }),
      name: tooShort('name'),
    }),
    issues: [
      { message: 'Need tags.', code: 'items', params: {}, path: ['tags'] },
      {
        message: 'min',
        code: 'min',
        params: { min: 2, amount: 1 },
        path: ['name'],
      },
    ],
    messages: { tags: [null], name: 'min' },
    error: 'tags: Need tags.\nname: min',
  },
  {
    label: 'a properties failure with an empty tree',
    validator: emptyContainer('properties', {}),
    input: {},
    failure: failed('properties', undefined, { message: 'Empty.', errors: {} }),
    issues: [{ message: 'Empty.', code: 'properties', params: {} }],
    messages: {},
    error: 'Empty.',
  },
  {
    label: 'an empty properties failure nested in an array',
    validator: array(emptyContainer('properties', {})),
    input: [1],
    failure: items(undefined, [
      failed('properties', '[0]', { message: 'Empty.', errors: {} }),
    ]),
    issues: [{ message: 'Empty.', code: 'properties', params: {}, path: [0] }],
    messages: [{}],
    error: '[0]: Empty.',
  },
  {
    label: 'an items failure of valid items nested in an object',
    validator: object({ tags: emptyContainer('items', [null, null]) }),
    input: {},
    failure: properties(undefined, {
      tags: failed('items', 'tags', {
        message: 'Empty.',
        errors: [null, null],
      }),
    }),
    issues: [{ message: 'Empty.', code: 'items', params: {}, path: ['tags'] }],
    messages: { tags: [null, null] },
    error: 'tags: Empty.',
  },
  {
    label: 'a container with an empty tree',
    validator: createValidator(async (value: unknown, field?: string) =>
      invalid({ code: 'items', value, field, errors: [] }),
    ),
    input: [],
    failure: items(undefined, []),
    issues: [{ message: 'items', code: 'items', params: {} }],
    messages: [],
    error: 'items',
  },
];

for (const row of rows) {
  test(`should keep the failure in the tree for ${row.label}`, async () => {
    assert.deepEqual(await row.validator(row.input, row.field), row.failure);
  });

  test(`should report the leaves as issues for ${row.label}`, async () => {
    assert.deepEqual<unknown>(
      await row.validator['~standard'].validate(row.input),
      {
        issues: row.issues,
      },
    );
  });

  test(`should give the message tree for ${row.label}`, async () => {
    assert.deepEqual(
      messageTree(await row.validator(row.input, row.field)),
      row.messages,
    );
  });

  test(`should join the leaves into the FailureError message for ${row.label}`, async () => {
    const error = await rejection(parse(row.validator, row.input, row.field));
    assert.instanceOf(error, FailureError);
    assert.strictEqual(error.message, row.error);
  });
}

test('should give undefined as the message tree when the result is valid', async () => {
  assert.isUndefined(messageTree(await string()('a')));
});

test('should type the message tree from the error type', async () => {
  expectTypeOf(messageTree(await user({}))).toEqualTypeOf<
    | string
    | {
        a?: string | { b?: string };
        tags?: string | (string | { name?: string } | null)[];
      }
    | undefined
  >();
  expectTypeOf(messageTree(await signup({}))).toEqualTypeOf<
    string | { password?: string; confirm?: string } | undefined
  >();
});

const readonlyItems: readonly Failure<never>[] = [];

interface NamedChildren {
  child?: Failure<never>;
}

const namedChildren: NamedChildren = {};

test('should type the message tree of a readonly array or an interface', async () => {
  expectTypeOf(
    messageTree(
      await invalid({ code: 'items', field: undefined, errors: readonlyItems }),
    ),
  ).toEqualTypeOf<string | string[] | undefined>();
  expectTypeOf(
    messageTree(
      await invalid({
        code: 'properties',
        field: undefined,
        errors: namedChildren,
      }),
    ),
  ).toEqualTypeOf<string | { child?: string } | undefined>();
});

/** What a promise rejects with, or `'resolved'`. */
const rejection = async (promise: unknown) =>
  Promise.resolve(promise).then(
    () => 'resolved',
    (error: unknown) => error,
  );

/** What `fn` throws, or `'returned'`. */
const thrownBy = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error;
  }

  return 'returned';
};

/** Decodes a validator's failure, and gives what that throws or rejects with. */
type Decoder = (validator: TypeValidator<unknown, unknown>) => Promise<unknown>;

const decoders: [string, Decoder][] = [
  [
    'messageTree()',
    async (validator) => {
      const made = await validator({});
      return thrownBy(() => messageTree(made));
    },
  ],
  [
    'the FailureError constructor',
    async (validator) => {
      const made = await validator({});
      return thrownBy(() => Reflect.construct(FailureError, [made]));
    },
  ],
  [
    '~standard.validate',
    async (validator) => rejection(validator['~standard'].validate({})),
  ],
  ['parse()', async (validator) => rejection(parse(validator, {}))],
];

/** What each decoder throws or rejects with. */
async function decoderErrors(validator: TypeValidator<unknown, unknown>) {
  const errors: unknown[] = [];
  for (const [, decode] of decoders) {
    errors.push(await decode(validator));
  }

  return errors;
}

// A hand-built container whose errors aren't a tree is a bug (ADR 0001).
test.each<[string, unknown, string]>([
  ['a number', 5, 'errors tree must be an object'],
  ['a string', 'oops', 'errors tree must be an object'],
  ['null', null, 'errors tree must be an object'],
  [
    'an object entry that is not a failure',
    { a: 'Too short.' },
    "entry at a isn't a failure",
  ],
  [
    'an array entry that is not a failure',
    [{ code: 'min' }],
    "entry at 0 isn't a failure",
  ],
  [
    'a hole in an array',
    Object.assign([], { 1: null }),
    "entry at 0 isn't a failure",
  ],
  [
    'an entry with only its state',
    { a: { state: 'invalid' } },
    "entry at a isn't a failure",
  ],
  [
    'an entry whose state is not invalid',
    { a: { state: 'valid', code: 'min', params: {}, message: 'min' } },
    "entry at a isn't a failure",
  ],
  [
    'an entry without a code',
    { a: { state: 'invalid', params: {}, message: 'min' } },
    "entry at a isn't a failure",
  ],
  [
    'an entry without params',
    { a: { state: 'invalid', code: 'min', message: 'min' } },
    "entry at a isn't a failure",
  ],
  [
    'an entry whose params are null',
    { a: { state: 'invalid', code: 'min', params: null, message: 'min' } },
    "entry at a isn't a failure",
  ],
  [
    'an entry whose message is not a string',
    { a: { state: 'invalid', code: 'min', params: {}, message: 1 } },
    "entry at a isn't a failure",
  ],
])(
  'should throw when a container decodes errors that hold %s',
  async (_, errors, text) => {
    const malformed = createValidator(async (value: unknown, field?: string) =>
      invalid({ code: 'properties', value, field, errors }),
    );
    for (const error of await decoderErrors(malformed)) {
      assert.instanceOf(error, TypeError);
      assert.include(String(error), text);
    }
  },
);

// A custom validator that resolves to something other than a result is a bug.
test.each<[string, string]>([
  ['an empty object', '{}'],
  ['an unknown state', '{ "state": "pending" }'],
  [
    'a failure without params and message',
    '{ "state": "invalid", "code": "x" }',
  ],
])('should throw when a decoder reads %s as a result', async (_, json) => {
  const bogus: Validator = async () => JSON.parse(json);
  for (const error of await decoderErrors(createValidator(bogus))) {
    assert.instanceOf(error, TypeError);
    assert.include(String(error), "result isn't a failure");
  }
});

/** A validator whose failure nests `levels` `properties` failures above a leaf. */
const nestedValidator = (levels: number) =>
  createValidator(async () => {
    let made: Result = await invalid({
      code: 'min',
      field: undefined,
    });
    for (let level = 0; level < levels; level++) {
      made = await invalid({
        code: 'properties',
        field: undefined,
        errors: { a: made },
      });
    }
    return made;
  });

test('should decode an errors tree 1000 levels deep', async () => {
  const deep = nestedValidator(1000);
  const made = await deep({});
  let messages = messageTree(made);
  for (let level = 0; level < 1000; level++) {
    assert.isObject(messages);
    messages = Reflect.get(Object(messages), 'a');
  }
  assert.strictEqual(messages, 'min');
  const result = await deep['~standard'].validate({});
  assert.lengthOf(result.issues ?? [], 1);
  assert.lengthOf(result.issues?.[0]?.path ?? [], 1000);
});

test.each([1001, 10_000])(
  'should throw before decoding an errors tree %i levels deep',
  async (levels) => {
    for (const error of await decoderErrors(nestedValidator(levels))) {
      assert.instanceOf(error, TypeError);
      assert.include(String(error), 'deeper than 1000 levels');
    }
  },
);

test('should throw when decoding a cyclic errors tree', async () => {
  const errors: { a?: unknown } = {};
  const cyclic = failed('properties', undefined, { errors });
  errors.a = cyclic;
  for (const error of await decoderErrors(
    createValidator(async () => cyclic),
  )) {
    assert.instanceOf(error, TypeError);
    assert.include(String(error), 'deeper than 1000 levels');
  }
});

/** A validator whose `items` failure holds `entries` valid items. */
const flatValidator = (entries: number) =>
  createValidator(async () =>
    invalid({
      code: 'items',
      field: undefined,
      errors: Array.from({ length: entries }, () => null),
    }),
  );

test('should give the message tree of an errors tree with 1000000 entries', async () => {
  const flat = flatValidator(1_000_000);
  assert.lengthOf(Object(messageTree(await flat({}))), 1_000_000);
});

test('should give one issue for an errors tree with 1000000 entries', async () => {
  const result = await flatValidator(1_000_000)['~standard'].validate({});
  assert.lengthOf(result.issues ?? [], 1);
});

test('should reject with a FailureError for an errors tree with 1000000 entries', async () => {
  const error = await rejection(parse(flatValidator(1_000_000), {}));
  assert.instanceOf(error, FailureError);
  assert.strictEqual(error.message, 'items');
});

// One test per decoder, as each walks a million entries before it throws.
test.each(decoders)(
  'should throw before %s decodes an errors tree with 1000001 entries',
  async (_, decode) => {
    const error = await decode(flatValidator(1_000_001));
    assert.instanceOf(error, TypeError);
    assert.include(String(error), 'more than 1000000 entries');
  },
);

// Shared children are walked once per reference, doubling the work per level.
const doubling = createValidator(async () => {
  let made: Result = await invalid({ code: 'min', field: undefined });
  for (let level = 0; level < 20; level++) {
    made = await invalid({
      code: 'properties',
      field: undefined,
      errors: { a: made, b: made },
    });
  }
  return made;
});

test.each(decoders)(
  'should throw when shared children multiply past 1000000 entries in %s',
  async (_, decode) => {
    const error = await decode(doubling);
    assert.instanceOf(error, TypeError);
    assert.include(String(error), 'more than 1000000 entries');
  },
);
