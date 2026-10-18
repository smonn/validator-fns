import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  array,
  boolean,
  createTypeValidatorTest,
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
  valid,
  type Failure,
  type TypeValidator,
} from '../src/index.js';

// Not an Error, so a wrapped or converted rejection can't pass for it.
const bug = { bug: true };
const throwBug = (): never => {
  throw bug;
};
// Validators are async, so a custom one rejects rather than throws.
const rejectBug = async (): Promise<never> => throwBug();

const custom = createTypeValidatorTest(
  { parser: async (value: unknown, field?: string) => valid({ value, field }) },
  (value: unknown) => value,
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
  ['a string() parser', string({ parser: throwBug }), 'a'],
  ['a number() parser', number({ parser: throwBug }), 1],
  ['a boolean() parser', boolean({ parser: throwBug }), true],
  ['a date() parser', date({ parser: throwBug }), new Date(0)],
  ['an array() parser', array(string(), { parser: throwBug }), ['a']],
  ['a custom type parser', custom({ parser: throwBug }), 'a'],
  [
    'a parser promise from another realm',
    string({ parser: () => runInNewContext('Promise.reject(bug)', { bug }) }),
    'a',
  ],
  [
    'a custom type applyConfig',
    createTypeValidatorTest(
      {
        parser: async (value: unknown, field?: string) =>
          valid({ value, field }),
      },
      (): unknown => throwBug(),
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
  ['a string() parser', string({ parser: unreadable }), 'x', 'Unreadable.'],
  ['a number() parser', number({ parser: unreadable }), 'x', 'Unreadable.'],
  ['a boolean() parser', boolean({ parser: unreadable }), 'x', 'Unreadable.'],
  ['a date() parser', date({ parser: unreadable }), 'x', 'Unreadable.'],
  [
    'an array() parser',
    array(string(), { parser: unreadable }),
    'x',
    'Unreadable.',
  ],
  ['a custom type parser', custom({ parser: unreadable }), 'x', 'Unreadable.'],
  [
    'a custom type parser in optional()',
    optional(custom({ parser: unreadable })),
    'x',
    'Unreadable.',
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
  const validate = string({ parser: unreadable }, throwBug);

  assert.deepInclude(await validate('x'), { state: 'invalid' });
});

test('should await a parser promise from another realm', async () => {
  const validate = string({
    parser: () =>
      runInNewContext('Promise.resolve({ state: "valid", value: "parsed" })'),
  });

  assert.deepInclude(await validate('x'), { state: 'valid', value: 'parsed' });
});

// [label, builds a validator or test from bad configuration]
test.each<[string, () => unknown]>([
  // JSON.parse returns any, which lets the test pass values the types reject.
  ['object() without a schema', () => object(JSON.parse('"schema"'))],
  [
    'array() in the 2.x order',
    () => Reflect.apply(array, undefined, [{}, string()]),
  ],
  ['minDate() with an unreadable limit', () => minDate('nonsense', 'm')],
  ['maxDate() with an unreadable limit', () => maxDate('nonsense', 'm')],
])('should throw a TypeError when building %s', (_label, build) => {
  assert.throws(build, TypeError);
});
