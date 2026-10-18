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
  invalid<never>({ message: 'Unreadable.', value, field });

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
  ['a string() requiredMessage', string({ requiredMessage: throwBug }), ''],
  ['a number() requiredMessage', number({ requiredMessage: throwBug }), null],
  ['a boolean() requiredMessage', boolean({ requiredMessage: throwBug }), null],
  ['a date() requiredMessage', date({ requiredMessage: throwBug }), null],
  [
    'an array() requiredMessage',
    array(string(), { requiredMessage: throwBug }),
    null,
  ],
  [
    'an object() requiredMessage',
    object({}, { requiredMessage: throwBug }),
    null,
  ],
  [
    'a custom type requiredMessage',
    custom({ requiredMessage: throwBug }),
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
  },
);

// [label, validator, unreadable input, message]
test.each<[string, TypeValidator<unknown, unknown>, unknown, string]>([
  ['string()', string(), Symbol('s'), 'Failed to parse value to string.'],
  ['string() with an object', string(), {}, 'Failed to parse value to string.'],
  [
    'string() with an invalid date',
    string(),
    new Date(Number.NaN),
    'Failed to parse value to string.',
  ],
  ['number()', number(), 'abc', 'Failed to parse value to number.'],
  ['date()', date(), 'tomorrow', 'Failed to parse value to date.'],
  ['date() with a boolean', date(), true, 'Failed to parse value to date.'],
  [
    'optional(date())',
    optional(date()),
    'tomorrow',
    'Failed to parse value to date.',
  ],
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
  async (_label, validate, input, message) => {
    const expected: Failure<unknown> = {
      state: 'invalid',
      message,
      field: 'f',
      errors: undefined,
    };
    assert.deepEqual(await validate(input, 'f'), expected);
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
  ['array() in the 2.x order', () => array(JSON.parse('{}'), string())],
  ['minDate() with an unreadable limit', () => minDate('nonsense', 'm')],
  ['maxDate() with an unreadable limit', () => maxDate('nonsense', 'm')],
])('should throw a TypeError when building %s', (_label, build) => {
  assert.throws(build, TypeError);
});
