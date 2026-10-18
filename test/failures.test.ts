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
  invalid({ message: 'custom', value, field }),
);

// Each validator with an input it fails, one per way a failure is made.
const failures: [string, Validator, unknown][] = [
  ['string, missing', string(), ''],
  ['string, unparseable', string(), {}],
  ['string, test', string(min(5, 'min')), 'abc'],
  ['number, unparseable', number(), 'abc'],
  ['number, test', number(min(5, 'min')), '3'],
  ['number, integer', number(integer('integer')), '1.5'],
  ['boolean, missing', boolean(), undefined],
  ['boolean, test', boolean(oneOf([true], 'oneOf')), false],
  ['date, unparseable', date(), 'tomorrow'],
  ['array, missing', array(number()), null],
  ['array, item', array(number()), ['abc']],
  ['array, test', array(number(), min(5, 'min')), ['3']],
  ['object, missing', object({ a: string() }), undefined],
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
  ['optional', optional(number(min(5, 'min'))), '3'],
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
    ['createValidatorTest', createValidatorTest(() => false, 'test')(1)],
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
    ['invalid', invalid({ message: 'm', value: 1, field: undefined })],
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
      'requiredMessage',
      number({ requiredMessage: ({ value }) => `got ${String(value)}` })('  '),
      'got NaN',
    ],
    ['test template', number(min(5, '{value} < {min}'))('3'), '3 < 5'],
    [
      'test function',
      string(min(5, ({ value }) => `${String(value)} is short`))('abc'),
      'abc is short',
    ],
    [
      'check',
      check(
        (value: { a: number }) => value.a > 1,
        ({ value }) => `a is ${String(value?.a)}`,
      )({ a: 1 }),
      'a is 1',
    ],
    [
      'invalid',
      invalid({
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
  const result = await invalid({ message: 'got {value}', field: 'a' });
  assert.deepEqual(result, {
    state: 'invalid',
    message: 'got undefined',
    field: 'a',
    errors: undefined,
  });
});
