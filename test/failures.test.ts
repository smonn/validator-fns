import { assert, test } from 'vitest';
import {
  array,
  boolean,
  check,
  createValidator,
  createValidatorTest,
  date,
  integer,
  invalid,
  max,
  min,
  number,
  object,
  oneOf,
  optional,
  string,
  type Result,
  type Validator,
} from '../src/index.js';

const failing = createValidator(async (value, field) =>
  invalid({ code: 'custom', message: 'custom', value, field }),
);
const unreadable = async (value: unknown, field?: string) =>
  invalid<never>({ code: 'custom', message: 'parser', value, field });

// Each validator with an input it fails, one per way a failure is made.
const failures: [string, Validator, unknown][] = [
  ['string, missing', string(), undefined],
  ['string, unparseable', string(), {}],
  ['string, test', string(min(5, 'min')), 'abc'],
  ['string, parser', string({ parser: unreadable }), 'x'],
  ['number, unparseable', number(), 'abc'],
  ['number, test', number(min(5, 'min')), 3],
  ['number, integer', number(integer('integer')), 1.5],
  ['boolean, missing', boolean(), undefined],
  ['boolean, wrong type', boolean(), 'true'],
  ['boolean, test', boolean(oneOf([true], 'oneOf')), false],
  ['date, unparseable', date(), 'tomorrow'],
  ['array, missing', array(number()), null],
  ['array, wrong type', array(number()), new Set([1])],
  ['array, item', array(number()), ['abc']],
  ['array, test', array(number(), min(5, 'min')), [3]],
  ['array, parser', array(number(), { parser: unreadable }), ['3']],
  ['object, missing', object({ a: string() }), undefined],
  ['object, wrong type', object({ a: string() }), []],
  ['object, field', object({ a: string() }), {}],
  [
    'object, test',
    object(
      { a: string() },
      check(() => false, 'check'),
    ),
    { a: 'x' },
  ],
  [
    'object, test with a path',
    object(
      { a: string() },
      check('a', () => false, 'check'),
    ),
    { a: 'x' },
  ],
  [
    'string, worded by the config',
    string({ messages: { min: 'min' } }, min(5)),
    'abc',
  ],
  [
    'string, parser worded by the config',
    string({
      parser: async (value, field) => invalid({ code: 'type', value, field }),
      messages: { type: 'type' },
    }),
    'x',
  ],
  ['array, test and item', array(number(), max(1)), ['a', 'b']],
  ['optional', optional(number(min(5, 'min'))), 3],
  ['optional custom validator', optional(failing), 'x'],
  ['createValidator', failing, 'x'],
];

test('should leave value off a failure when a validator fails', async () => {
  for (const [label, validate, input] of failures) {
    const result = await validate(input, 'field');
    assert.equal(result.state, 'invalid', label);
    assert.notProperty(result, 'value', label);
  }
});

test('should leave value off a failure when a test fails on its own', async () => {
  const tests: [string, Promise<Result>][] = [
    ['min', min(5, 'min')('abc')],
    ['oneOf', oneOf<string>(['a'], 'oneOf')('b')],
    ['createValidatorTest', createValidatorTest('test', () => false)(1)],
    ['check', check(() => false, 'check')({ a: 1 })],
    [
      'check with a key',
      check('a', (value: { a: number }) => value.a > 1, 'check')({ a: 1 }),
    ],
    [
      'check with a path',
      check(
        ['a', 'b'],
        (value: { a: { b: number } }) => value.a.b > 1,
        'check',
      )({ a: { b: 1 } }),
    ],
    [
      'invalid',
      invalid({ code: 'custom', message: 'm', value: 1, field: undefined }),
    ],
  ];
  for (const [label, promise] of tests) {
    const result = await promise;
    assert.equal(result.state, 'invalid', label);
    assert.notProperty(result, 'value', label);
  }
});

test('should give the value to a message when a failure leaves it off', async () => {
  const messages: [string, Promise<Result>, string][] = [
    [
      'required message',
      number({ messages: { required: ({ value }) => `got ${String(value)}` } })(
        null,
      ),
      'got null',
    ],
    ['test template', number(min(5, '{value} < {min}'))(3), '3 < 5'],
    [
      'test function',
      string(min(5, ({ value }) => `${String(value)} is short`))('abc'),
      'abc is short',
    ],
    [
      'check',
      check(
        (value: { a: number }) => value.a > 1,
        'check',
        ({ value }) => `a is ${String(value?.a)}`,
      )({ a: 1 }),
      'a is 1',
    ],
    [
      'invalid',
      invalid({
        code: 'custom',
        message: ({ value }) => `got ${String(value)}`,
        value: 7,
        field: undefined,
      }),
      'got 7',
    ],
  ];
  for (const [label, promise, message] of messages) {
    const result = await promise;
    assert.equal(result.state === 'invalid' && result.message, message, label);
    assert.notProperty(result, 'value', label);
  }
});

test('should format a message without a value when invalid() gets none', async () => {
  const result = await invalid({
    code: 'custom',
    message: 'got {value}',
    field: 'a',
  });
  assert.deepEqual(result, {
    state: 'invalid',
    code: 'custom',
    params: {},
    message: 'got undefined',
    field: 'a',
    errors: undefined,
  });
});
