import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  array,
  boolean,
  createTypeValidator,
  createValidator,
  date,
  invalid,
  maxDate,
  min,
  minDate,
  number,
  object,
  optional,
  parse,
  string,
  transform,
  valid,
  type Failure,
  type Result,
  type TypeValidator,
  type Validator,
} from '../src/index.js';

// Not an Error, so a wrapped or converted rejection can't pass for it.
const bug = { bug: true };
const throwBug = (): never => {
  throw bug;
};
// Validators are async, so a custom one rejects rather than throws.
const rejectBug = async (): Promise<never> => throwBug();

const custom = createTypeValidator(async (value: unknown, field?: string) =>
  valid({ value, field }),
);

const unreadable = async (value: unknown, field?: string) =>
  invalid<never, never, { expected: string }>({
    code: 'type',
    params: { expected: 'thing' },
    message: 'Unreadable.',
    value,
    field,
  });

/** What the promise rejects with, or `'resolved'`. */
const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => error,
  );

// [label, validator, input that reaches the throwing code]
test.each<[string, TypeValidator<unknown, unknown>, unknown]>([
  ['a string() test', string(throwBug), 'a'],
  ['a number() test', number(throwBug), 1],
  ['a boolean() test', boolean(throwBug), true],
  ['a date() test', date(throwBug), new Date(0)],
  ['an array() test', array(string(), throwBug), ['a']],
  ['an object() test', object({ a: string() }, throwBug), { a: 'a' }],
  ['a custom type test', custom(throwBug), 'a'],
  ['a string() transform', string(transform(throwBug)), 'a'],
  ['an object() transform', object({}, transform(throwBug)), {}],
  ['a built-in test message', string(min(5, throwBug)), 'abc'],
  [
    'a string() required message',
    string({ messages: { required: throwBug } }),
    undefined,
  ],
  [
    'a number() required message',
    number({ messages: { required: throwBug } }),
    null,
  ],
  [
    'a boolean() required message',
    boolean({ messages: { required: throwBug } }),
    null,
  ],
  [
    'a date() required message',
    date({ messages: { required: throwBug } }),
    null,
  ],
  [
    'an array() required message',
    array(string(), { messages: { required: throwBug } }),
    null,
  ],
  [
    'an object() required message',
    object({ a: string() }, { messages: { required: throwBug } }),
    null,
  ],
  [
    'a custom type required message',
    custom({ messages: { required: throwBug } }),
    null,
  ],
  ['a custom type test', custom(throwBug), 'a'],
  ['a custom type parser', createTypeValidator(rejectBug)(), 'a'],
  [
    'a custom type parser that throws without a promise',
    createTypeValidator(throwBug)(),
    'a',
  ],
  ["a custom type parser's test", createTypeValidator(string(throwBug))(), 'a'],
  [
    'a parser promise from another realm',
    createTypeValidator(() =>
      runInNewContext('Promise.reject(bug)', { bug }),
    )(),
    'a',
  ],
  ['an array() item', array(createValidator(rejectBug)), ['a']],
  ['an object() field', object({ a: createValidator(rejectBug) }), { a: 'a' }],
  ['a createValidator() function', createValidator(rejectBug), 'a'],
  ['a type validator in optional()', optional(string(throwBug)), 'a'],
  ['a custom validator in optional()', optional(rejectBug), 'a'],
  [
    'an array() item in optional()',
    optional(array(createValidator(rejectBug))),
    [1],
  ],
])(
  'should reject with the thrown value when %s throws',
  async (_label, validate, input) => {
    assert.strictEqual(await rejection(validate(input)), bug);
    assert.strictEqual(
      await rejection(Promise.resolve(validate['~standard'].validate(input))),
      bug,
    );
    assert.strictEqual(await rejection(parse(validate, input)), bug);
  },
);

// [label, validator, unreadable input, message, expected type]
test.each<[string, TypeValidator<unknown, unknown>, unknown, string, string?]>([
  ['string()', string(), Symbol('s'), 'type', 'string'],
  ['string() with an object', string(), {}, 'type', 'string'],
  [
    'string() with an invalid date',
    string(),
    new Date(Number.NaN),
    'type',
    'string',
  ],
  ['number()', number(), 'abc', 'type', 'number'],
  ['date()', date(), 'tomorrow', 'type', 'date'],
  ['date() with a boolean', date(), true, 'type', 'date'],
  ['optional(date())', optional(date()), 'tomorrow', 'type', 'date'],
  [
    'a custom type parser',
    createTypeValidator(unreadable)(),
    'x',
    'Unreadable.',
  ],
  [
    'a custom type parser in optional()',
    optional(createTypeValidator(unreadable)()),
    'x',
    'Unreadable.',
  ],
  [
    'a custom type parser that is a type validator',
    createTypeValidator(number())(),
    'x',
    'type',
    'number',
  ],
  ['createValidator()', createValidator(unreadable), 'x', 'Unreadable.'],
])(
  'should resolve to a failure when %s gets unreadable input',
  async (_label, validate, input, message, expected = 'thing') => {
    const failure: Failure<unknown> = {
      state: 'invalid',
      code: 'type',
      params: { expected },
      message,
      field: 'f',
      errors: undefined,
    };
    assert.deepEqual(await validate(input, 'f'), failure);
  },
);

test('should not call the tests when the parser fails', async () => {
  const validate = createTypeValidator(unreadable)(throwBug);

  assert.deepInclude(await validate('x'), { state: 'invalid' });
});

test('should await a parser promise from another realm', async () => {
  const validate = createTypeValidator(() =>
    runInNewContext('Promise.resolve({ state: "valid", value: "parsed" })'),
  )();

  assert.deepInclude(await validate('x'), { state: 'valid', value: 'parsed' });
});

/** Settles a thenable, as the executor of a Promise does. */
type Settle<R> = (
  resolve: (value: R) => void,
  reject: (reason: unknown) => void,
) => void;

/**
 * `target` with its own `then` from `descriptor`: a thenable that isn't a
 * Promise, as JavaScript code can return from a test, child or parser, or a
 * Promise with its own `then`. Typed as the Promise it stands in for.
 */
function defineThen<R>(
  target: object,
  descriptor: TypedPropertyDescriptor<Settle<R> | undefined>,
): Promise<R>;
function defineThen(target: object, descriptor: PropertyDescriptor): object {
  // oxlint-disable-next-line unicorn/no-thenable -- these tests need a thenable that isn't a Promise, or a Promise with its own `then`
  return Object.defineProperty(target, 'then', descriptor);
}

/**
 * A thenable whose `then` is `settle`, so it returns nothing, where a
 * Promise's returns a new Promise.
 */
const thenable = <R>(settle: Settle<R>) =>
  defineThen<R>({}, { value: settle, enumerable: true });

const resolving = <R>(result: R) =>
  thenable<R>((resolve) => {
    resolve(result);
  });
const rejectingLater = (reason: unknown) =>
  thenable<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(reason);
    });
  });
const resolvingTwice = <R>(first: R, second: R) =>
  thenable<R>((resolve) => {
    resolve(first);
    resolve(second);
  });

const ok = <T>(value: T, field?: string): Result<T, never> => ({
  state: 'valid',
  value,
  field,
});
const passOn = (value: unknown, field?: string) => resolving(ok(value, field));
const doubled = (value: number, field?: string) =>
  resolving(ok(value * 2, field));
const twice = <T>(value: T, field?: string) =>
  resolvingTwice<Result<T | string, never>>(
    ok(value, field),
    ok('again', field),
  );
// JSON.parse returns any, which lets a test return what the types reject.
const withThen = () =>
  JSON.parse('{ "state": "valid", "value": "b", "then": null }');

test('should settle a non-Promise thenable as a Promise would', async () => {
  assert.deepEqual(await number(doubled, doubled)(1), {
    state: 'valid',
    value: 4,
    field: undefined,
  });
  assert.deepInclude(await array(createValidator(passOn))(['a', 'b']), {
    value: ['a', 'b'],
  });
  assert.deepInclude(await object({ a: createValidator(passOn) })({ a: 1 }), {
    value: { a: 1 },
  });
  assert.deepInclude(await createTypeValidator(passOn)()(5), { value: 5 });
});

test('should reject with the reason of a non-Promise thenable', async () => {
  const later = () => rejectingLater(bug);

  assert.strictEqual(await rejection(string(later)('a')), bug);
  assert.strictEqual(await rejection(array(createValidator(later))([1])), bug);
  assert.strictEqual(
    await rejection(object({ a: createValidator(later) })({ a: 1 })),
    bug,
  );
  assert.strictEqual(await rejection(createTypeValidator(later)()(1)), bug);
});

test('should take only the first value of a thenable that calls back twice', async () => {
  let calls = 0;
  const counted = async (value: string, field?: string) => {
    calls += 1;
    return valid({ value, field });
  };

  assert.deepInclude(await array(createValidator(twice))(['a', 'b']), {
    value: ['a', 'b'],
  });
  assert.deepInclude(await string(twice, counted)('a'), { value: 'a' });
  assert.strictEqual(calls, 1);
});

/** How many times a `readOnce` thenable's `then` has been read. */
let reads = 0;
// A thenable whose `then` settles only on the first read, as a getter can.
const readOnce = (_value: unknown, field?: string) =>
  defineThen<Result<string, never>>(
    {},
    {
      get() {
        reads += 1;
        return reads === 1
          ? (resolve: (result: Result<string, never>) => void) => {
              resolve(ok('parsed', field));
            }
          : undefined;
      },
    },
  );
// A fulfilled Promise whose own `then` throws when read, which `await` skips.
const throwingThen = (value: unknown, field?: string) =>
  defineThen<Result<string, never>>(Promise.resolve(ok(String(value), field)), {
    get: throwBug,
  });

// The same, its `then` inherited from a prototype between it and Promise's.
const inheritedThrowingThen = (value: unknown, field?: string) => {
  const promise = Promise.resolve(ok(String(value), field));
  const prototype: object = Object.create(Promise.prototype);
  Object.setPrototypeOf(promise, defineThen(prototype, { get: throwBug }));
  return promise;
};

// [label, validator, input, the validator's value]
const adopters: [
  string,
  (step: Validator<string, never>) => TypeValidator<unknown, unknown>,
  unknown,
  (parsed: unknown) => unknown,
][] = [
  ['a test', (step) => string(step), 'a', (parsed) => parsed],
  [
    'an array() item',
    (step) => array(createValidator(step)),
    ['a'],
    (parsed) => [parsed],
  ],
  [
    'an object() property',
    (step) => object({ a: createValidator(step) }),
    { a: 'a' },
    (parsed) => ({ a: parsed }),
  ],
  ['a parser', (step) => createTypeValidator(step)(), 'a', (parsed) => parsed],
];

test.each(adopters)(
  'should read the `then` of a thenable from %s once',
  async (_label, build, input, expected) => {
    reads = 0;

    assert.deepInclude(await build(readOnce)(input), {
      state: 'valid',
      value: expected('parsed'),
    });
    assert.strictEqual(reads, 1);
  },
);

test.each(adopters)(
  'should await a Promise from %s without reading its own `then`',
  async (_label, build, input, expected) => {
    assert.deepInclude(await build(throwingThen)(input), {
      state: 'valid',
      value: expected('a'),
    });
  },
);

test.each(adopters)(
  'should await a Promise from %s without reading its inherited `then`',
  async (_label, build, input, expected) => {
    assert.deepInclude(await build(inheritedThrowingThen)(input), {
      state: 'valid',
      value: expected('a'),
    });
  },
);

test('should take a result with a `then` that is not a function as a result', async () => {
  assert.deepEqual(await string(withThen)('a'), {
    state: 'valid',
    value: 'b',
    field: undefined,
  });
});

test('should name the parser in the TypeError for one that is not a function', () => {
  assert.throws(
    () => createTypeValidator(JSON.parse('"parser"')),
    TypeError,
    '`parser` must be a validator',
  );
});

// [label, builds a validator or test from bad configuration]
test.each<[string, () => unknown]>([
  // JSON.parse returns any, which lets the test pass values the types reject.
  ['object() without a schema', () => object(JSON.parse('"schema"'))],
  [
    'createTypeValidator() without a validator',
    () => createTypeValidator(JSON.parse('"parser"')),
  ],
  [
    'array() in the 2.x order',
    () => Reflect.apply(array, undefined, [{}, string()]),
  ],
  ['minDate() with an unreadable limit', () => minDate('nonsense', 'm')],
  ['maxDate() with an unreadable limit', () => maxDate('nonsense', 'm')],
])('should throw a TypeError when building %s', (_label, build) => {
  assert.throws(build, TypeError);
});
