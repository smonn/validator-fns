import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  array,
  boolean,
  check,
  createValidator,
  createValidatorTest,
  date,
  email,
  exact,
  FailureError,
  integer,
  invalid,
  matches,
  max,
  maxDate,
  min,
  minDate,
  number,
  object,
  oneOf,
  optional,
  parse,
  string,
  transform,
  url,
  uuid,
  valid,
  type Failure,
  type Result,
  type Validator,
} from '../src/index.js';

/** What a row expects: the parsed value, or the failure without its state and field. */
type Expect =
  | { value: unknown }
  | {
      code: string;
      params: Record<string, unknown>;
      message: string;
      errors: unknown;
    };

/** One input through one validator, and the result it gives. */
type Row = {
  case: string;
  validator: Validator;
  input: unknown;
  field?: string | undefined;
  expect: Expect;
  /** What `optional()` of the validator gives, where the wrap rule below doesn't. */
  optional?: Expect | undefined;
};

const row = (
  name: string,
  validator: Validator,
  input: unknown,
  expect: Expect,
  more: { field?: string; optional?: Expect } = {},
): Row => ({ case: name, validator, input, expect, ...more });

const pass = (value: unknown): Expect => ({ value });

const fail = (
  code: string,
  params: Record<string, unknown> = {},
  message: string = code,
  errors?: unknown,
): Expect => ({ code, params, message, errors });

const typeFail = (expected: string) => fail('type', { expected });

const required = (message = 'required') => fail('required', {}, message);

/** A failure in an errors tree, as a container's `errors` hold it. */
const child = (
  field: string,
  code: string,
  params: Record<string, unknown> = {},
  message: string = code,
  errors?: unknown,
): Failure<unknown> => ({
  state: 'invalid',
  code,
  params,
  message,
  field,
  errors,
});

/**
 * A test as a validator, so a row can pass it input outside its type, as
 * JavaScript can.
 */
const untyped =
  (validate: (value: never, field?: string) => Promise<Result>): Validator =>
  async (value, field) => {
    const result: Result = await Reflect.apply(validate, undefined, [
      value,
      field,
    ]);
    return result;
  };

const trim = transform((value: string) => value.trim());

// Strings

const atLeastFive = untyped(min(5, 'min:{min}'));
const atMostFive = untyped(max(5, 'max:{max}'));
const anEmail = untyped(email('invalid email'));
const someUrl = untyped(url('invalid url', ['http:', 'mailto:', 'https:']));
const webUrl = untyped(url('invalid url'));
const mailtoUrl = untyped(url('invalid url', ['mailto:']));
const sticky = /a/y;
const fiveToTen = string(
  { messages: { required: 'Must enter a value.' } },
  trim,
  min(5, 'At least five characters.'),
  max(10, 'At most ten characters.'),
);
const helloByDefault = string({ default: 'hello' });
const aUuid = untyped(uuid('invalid uuid'));

class Point {
  x = 1;
}

const stringRows: Row[] = [
  row(
    'min() passes a string at its limit',
    atLeastFive,
    'hello',
    pass('hello'),
  ),
  row(
    'min() fails an empty string',
    atLeastFive,
    '',
    fail('min', { min: 5, amount: 0 }, 'min:5'),
  ),
  row(
    'min() fails a string below its limit',
    atLeastFive,
    'foo',
    fail('min', { min: 5, amount: 3 }, 'min:5'),
  ),
  row('max() passes a string at its limit', atMostFive, 'hello', pass('hello')),
  row('max() passes an empty string', atMostFive, '', pass('')),
  row(
    'max() fails a string above its limit',
    atMostFive,
    'foo bar',
    fail('max', { max: 5, amount: 7 }, 'max:5'),
  ),
  ...['name@example.com', 'name@host', 'name+tag@example.com'].map((input) =>
    row(`email() passes ${input}`, anEmail, input, pass(input)),
  ),
  ...['', '@example.com', 'name.com', 'name@.com'].map((input) =>
    row(
      `email() fails '${input}'`,
      anEmail,
      input,
      fail('email', {}, 'invalid email'),
    ),
  ),
  ...['http://example.com', 'mailto:name@example.com'].map((input) =>
    row(`url() passes ${input} in its protocols`, someUrl, input, pass(input)),
  ),
  ...['', '/foo', 'unknown://path'].map((input) =>
    row(
      `url() fails '${input}' with its protocols`,
      someUrl,
      input,
      fail('url', { protocols: ['http:', 'mailto:', 'https:'] }, 'invalid url'),
    ),
  ),
  ...['http://example.com', 'https://example.com/path'].map((input) =>
    row(`url() passes ${input} by default`, webUrl, input, pass(input)),
  ),
  ...[
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:name@example.com',
    'ftp://example.com',
  ].map((input) =>
    row(
      `url() fails ${input} by default`,
      webUrl,
      input,
      fail('url', { protocols: ['http:', 'https:'] }, 'invalid url'),
    ),
  ),
  row(
    'url() passes a protocol that replaces the default',
    mailtoUrl,
    'mailto:name@example.com',
    pass('mailto:name@example.com'),
  ),
  row(
    'url() fails a default protocol its protocols replace',
    mailtoUrl,
    'https://example.com',
    fail('url', { protocols: ['mailto:'] }, 'invalid url'),
  ),
  row(
    'url() passes the default protocols to the message',
    untyped(url('Use {protocols}.')),
    'mailto:name@example.com',
    fail('url', { protocols: ['http:', 'https:'] }, 'Use http:,https:.'),
  ),
  row(
    'matches() with the sticky flag matches from the start',
    untyped(matches(sticky, 'invalid')),
    'ba',
    fail('matches', { pattern: sticky }, 'invalid'),
  ),
  row(
    'string() passes a string in its limits',
    fiveToTen,
    'hello',
    pass('hello'),
  ),
  row(
    'string() runs its tests on the trimmed value',
    fiveToTen,
    '  test  ',
    fail('min', { min: 5, amount: 4 }, 'At least five characters.'),
  ),
  row(
    'string() fails at a later test',
    fiveToTen,
    'hello world',
    fail('max', { max: 10, amount: 11 }, 'At most ten characters.'),
  ),
  row(
    'string() words a missing value from its messages',
    fiveToTen,
    undefined,
    required('Must enter a value.'),
  ),
  row(
    'string() trims a blank string to empty before its tests',
    fiveToTen,
    '  ',
    fail('min', { min: 5, amount: 0 }, 'At least five characters.'),
  ),
  row(
    'string() with tests fails an object with type',
    fiveToTen,
    { name: 'August' },
    typeFail('string'),
  ),
  row(
    'string() fills undefined with its default',
    helloByDefault,
    undefined,
    pass('hello'),
  ),
  row(
    'string() keeps an empty string over its default',
    helloByDefault,
    '',
    pass(''),
  ),
  row(
    'string() keeps a present string over its default',
    helloByDefault,
    'other',
    pass('other'),
  ),
  ...[123, 0, false].map((input) =>
    row(
      `string() with a default fails ${String(input)} with type`,
      helloByDefault,
      input,
      typeFail('string'),
    ),
  ),
  row('string() keeps whitespace without trim', string(), ' a ', pass(' a ')),
  row(
    'string() keeps whitespace in its default without trim',
    string({ default: ' x ' }),
    undefined,
    pass(' x '),
  ),
  row(
    'string() ignores a trim option from JavaScript',
    string(JSON.parse('{ "trim": true }')),
    ' a ',
    pass(' a '),
  ),
  ...[
    // One per RFC 9562 version, 1 to 8, from the RFC's examples where it has one.
    'c232ab00-9414-11ec-b3c8-9f6bdeced846',
    '000003e8-cbb9-21ea-b201-00045a86c8a1',
    '5df41881-3aed-3515-88a7-2f4a814cf09e',
    '919108f7-52d1-4320-9bac-f847db4148a8',
    '2ed6657d-e927-568b-95e1-2665a8aea6a2',
    '1ec9414c-232a-6b00-b3c8-9f6bdeced846',
    '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
    '2489e9ad-2ee2-8e00-8ec9-32d5f69181c0',
    // Nil and max.
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    // Uppercase.
    '919108F7-52D1-4320-9BAC-F847DB4148A8',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
  ].map((input) => row(`uuid() passes ${input}`, aUuid, input, pass(input))),
  ...[
    // Braces and missing hyphens.
    '{919108f7-52d1-4320-9bac-f847db4148a8}',
    '919108f752d143209bacf847db4148a8',
    // Versions 0 and 9 outside nil.
    '919108f7-52d1-0320-9bac-f847db4148a8',
    '919108f7-52d1-9320-9bac-f847db4148a8',
    // Variants other than RFC 9562's 10xx.
    '919108f7-52d1-4320-7bac-f847db4148a8',
    '919108f7-52d1-4320-cbac-f847db4148a8',
    // Wrong length, non-hex, surrounding text.
    '919108f7-52d1-4320-9bac-f847db4148a',
    '919108f7-52d1-4320-9bac-f847db4148a8a',
    '919108g7-52d1-4320-9bac-f847db4148a8',
    ' 919108f7-52d1-4320-9bac-f847db4148a8',
    'id:919108f7-52d1-4320-9bac-f847db4148a8',
    'urn:uuid:919108f7-52d1-4320-9bac-f847db4148a8',
    '',
  ].map((input) =>
    row(
      `uuid() fails '${input}'`,
      aUuid,
      input,
      fail('uuid', {}, 'invalid uuid'),
    ),
  ),
  ...(
    [
      [1, 'number'],
      [1n, 'bigint'],
      [true, 'boolean'],
      [new String('x'), 'String object'],
      [new Number(3), 'Number object'],
      [new Boolean(false), 'Boolean object'],
      [runInNewContext('new String("y")'), 'String object from another realm'],
      [new Date(0), 'date'],
      [[1], 'array'],
      [[], 'empty array'],
      [new Map(), 'Map'],
      [new Set([1]), 'Set'],
      [() => 1, 'function'],
      [/re/, 'RegExp'],
      [{}, 'plain object'],
      [Object.create(null), 'null-prototype object'],
      [new Point(), 'class instance'],
      [{ [Symbol.toStringTag]: 'String' }, 'object tagged String'],
      [Symbol('s'), 'symbol'],
    ] satisfies [unknown, string][]
  ).map(([input, label]) =>
    row(
      `string() fails a ${label} with type`,
      string(),
      input,
      typeFail('string'),
    ),
  ),
];

// Numbers

const fromMinusTenToTen = number(
  { messages: { required: 'Must enter a value.' } },
  min(-10, 'Must be at least -10.'),
  max(10, 'Must be at most 10.'),
);
const positive = number(check((value: number) => value > 0, 'positive'));
const fiveByDefault = number({ default: 5 });
const anInteger = untyped(integer('integer'));

const numberRows: Row[] = [
  row(
    'min() fails NaN',
    atLeastFive,
    Number.NaN,
    fail('min', { min: 5, amount: Number.NaN }, 'min:5'),
  ),
  row(
    'min() fails a number below its limit',
    atLeastFive,
    0,
    fail('min', { min: 5, amount: 0 }, 'min:5'),
  ),
  row('min() passes a number above its limit', atLeastFive, 5.01, pass(5.01)),
  row('min() passes a number at its limit', atLeastFive, 5, pass(5)),
  row(
    'min() fails a number just below its limit',
    atLeastFive,
    4.99,
    fail('min', { min: 5, amount: 4.99 }, 'min:5'),
  ),
  row(
    'max() fails NaN',
    atMostFive,
    Number.NaN,
    fail('max', { max: 5, amount: Number.NaN }, 'max:5'),
  ),
  row('max() passes a number below its limit', atMostFive, 0, pass(0)),
  row(
    'max() fails a number just above its limit',
    atMostFive,
    5.01,
    fail('max', { max: 5, amount: 5.01 }, 'max:5'),
  ),
  row('max() passes a number at its limit', atMostFive, 5, pass(5)),
  row(
    'max() passes a number just below its limit',
    atMostFive,
    4.99,
    pass(4.99),
  ),
  row(
    'integer() fails NaN',
    anInteger,
    Number.NaN,
    fail('integer', {}, 'integer'),
  ),
  row('integer() passes zero', anInteger, 0, pass(0)),
  row(
    'integer() fails a fraction',
    anInteger,
    0.1,
    fail('integer', {}, 'integer'),
  ),
  ...[0, -10, 10].map((input) =>
    row(
      `number() passes ${input} in its limits`,
      fromMinusTenToTen,
      input,
      pass(input),
    ),
  ),
  row(
    'number() fails a number above its max',
    fromMinusTenToTen,
    11,
    fail('max', { max: 10, amount: 11 }, 'Must be at most 10.'),
  ),
  row(
    'number() fails a number below its min',
    fromMinusTenToTen,
    -11,
    fail('min', { min: -10, amount: -11 }, 'Must be at least -10.'),
  ),
  row(
    'number() words null from its messages',
    fromMinusTenToTen,
    null,
    required('Must enter a value.'),
  ),
  row(
    'number() with tests fails an object with type',
    fromMinusTenToTen,
    {},
    typeFail('number'),
  ),
  row(
    'check() writes a strict bound that fails at the bound',
    positive,
    0,
    fail('positive', {}, 'positive'),
  ),
  row(
    'check() writes a strict bound that passes above it',
    positive,
    0.1,
    pass(0.1),
  ),
  row(
    'number() fills undefined with its default',
    fiveByDefault,
    undefined,
    pass(5),
  ),
  row(
    'number() keeps a present number over its default',
    fiveByDefault,
    123,
    pass(123),
  ),
  ...(
    [
      ['1.5', 'numeric string'],
      ['', 'empty string'],
      ['  ', 'blank string'],
      [Number.NaN, 'NaN'],
      [Infinity, 'Infinity'],
      [1n, 'bigint'],
      [new Number(3), 'Number object'],
      [new String('4'), 'String object holding a number'],
      [new Date(5), 'date'],
      [[1], 'array'],
      [[[1, 2]], 'nested array'],
      [[], 'empty array'],
      [{}, 'plain object'],
      [Object.create(null), 'null-prototype object'],
      [new Map(), 'Map'],
      [() => 1, 'function'],
      [Symbol('s'), 'symbol'],
      ['abc', 'unparseable string'],
      ['NaN', 'the string NaN'],
      [true, 'boolean'],
      [new String('x'), 'String object holding an unparseable string'],
    ] satisfies [unknown, string][]
  ).map(([input, label]) =>
    row(
      `number() fails a ${label} with type`,
      number(),
      input,
      typeFail('number'),
    ),
  ),
];

// Booleans

const aBoolean = boolean({ messages: { required: 'required' } });
const trueByDefault = boolean({ default: true });

const booleanRows: Row[] = [
  row('boolean() fails null with required', aBoolean, null, required()),
  row(
    'boolean() fails undefined with required',
    aBoolean,
    undefined,
    required(),
  ),
  row('boolean() passes true', aBoolean, true, pass(true)),
  row('boolean() passes false', aBoolean, false, pass(false)),
  ...['true', 'false', 1, 0, {}].map((input) =>
    row(
      `boolean() fails ${JSON.stringify(input)} with type`,
      aBoolean,
      input,
      typeFail('boolean'),
    ),
  ),
  row(
    'boolean() fills undefined with its default',
    trueByDefault,
    undefined,
    pass(true),
  ),
  row('boolean() fills null with its default', trueByDefault, null, pass(true)),
  row(
    'boolean() keeps false over its default',
    trueByDefault,
    false,
    pass(false),
  ),
];

// Dates

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(now.getDate() + 1);
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const nextMonth = new Date(now);
nextMonth.setMonth(now.getMonth() + 1);
const earliest = new Date(-8.64e15);
const notAfterNow = untyped(
  maxDate(now, ({ max: limit }) => `max:${limit.toISOString()}`),
);
const notBeforeNow = untyped(
  minDate(now, ({ min: limit }) => `min:${limit.toISOString()}`),
);
const thisMonth = date(
  { messages: { required: 'required' } },
  minDate(now, 'min'),
  maxDate(nextMonth, 'max'),
);
const epochByDefault = date({ default: new Date(0) });
const spoof = new Date(0);
spoof.valueOf = () => 5;
const throwing = new Date(0);
throwing.valueOf = () => {
  throw new Error('valueOf');
};

const dateRows: Row[] = [
  ...(
    [
      [0, new Date(0)],
      ['2020', new Date(2020, 0)],
      ['2020-13', new Date(2021, 0)],
      ['2020-01', new Date(2020, 0)],
      ['2020-01-31', new Date(2020, 0, 31)],
      ['2020-01-31 12:45', new Date(2020, 0, 31, 12, 45)],
      ['2020-01-31T12:45:32', new Date(2020, 0, 31, 12, 45, 32)],
      ['2020-01-31T12:45:32Z', new Date(Date.UTC(2020, 0, 31, 12, 45, 32))],
      [
        '2020-01-31T12:45:32+01:30',
        new Date(Date.UTC(2020, 0, 31, 14, 15, 32)),
      ],
      ['2020-01-31T12:45:32-0200', new Date(Date.UTC(2020, 0, 31, 10, 45, 32))],
      ['2020-01-31T12:45:32.123', new Date(2020, 0, 31, 12, 45, 32, 123)],
      [
        '2020-01-31T12:45:32.001242Z',
        new Date(Date.UTC(2020, 0, 31, 12, 45, 32, 1.242)),
      ],
    ] satisfies [string | number, Date][]
  ).map(([limit, parsed]) =>
    row(
      `minDate() reads ${JSON.stringify(limit)} as its limit`,
      untyped(minDate(limit)),
      earliest,
      fail('minDate', { min: parsed }),
    ),
  ),
  row('minDate() passes its limit', notBeforeNow, now, pass(now)),
  row('minDate() passes a later date', notBeforeNow, tomorrow, pass(tomorrow)),
  row(
    'minDate() fails an earlier date',
    notBeforeNow,
    yesterday,
    fail('minDate', { min: now }, `min:${now.toISOString()}`),
  ),
  row('maxDate() passes its limit', notAfterNow, now, pass(now)),
  row(
    'maxDate() fails a later date',
    notAfterNow,
    tomorrow,
    fail('maxDate', { max: now }, `max:${now.toISOString()}`),
  ),
  row(
    'maxDate() passes an earlier date',
    notAfterNow,
    yesterday,
    pass(yesterday),
  ),
  row(
    'minDate() compares the time of an input with an own valueOf',
    untyped(minDate(new Date(1))),
    spoof,
    fail('minDate', { min: new Date(1) }),
  ),
  row(
    'maxDate() compares the time of an input with an own valueOf',
    untyped(maxDate(new Date(-1))),
    spoof,
    fail('maxDate', { max: new Date(-1) }),
  ),
  row(
    'minDate() compares the time of a limit with an own valueOf',
    untyped(minDate(spoof)),
    new Date(1),
    pass(new Date(1)),
  ),
  row(
    'maxDate() compares the time of a limit with an own valueOf',
    untyped(maxDate(spoof)),
    new Date(-1),
    pass(new Date(-1)),
  ),
  row(
    'minDate() in date() never calls an input own valueOf',
    date(minDate(new Date(0))),
    throwing,
    pass(throwing),
  ),
  row(
    'maxDate() never calls a limit own valueOf',
    untyped(maxDate(throwing)),
    new Date(0),
    pass(new Date(0)),
  ),
  row('date() passes its min', thisMonth, now, pass(now)),
  row('date() passes its max', thisMonth, nextMonth, pass(nextMonth)),
  row(
    'date() passes a date in its limits',
    thisMonth,
    tomorrow,
    pass(tomorrow),
  ),
  row(
    'date() with tests fails an empty string with type',
    thisMonth,
    '',
    typeFail('date'),
  ),
  row('date() fails null with required', thisMonth, null, required()),
  row('date() fails undefined with required', thisMonth, undefined, required()),
  row(
    'date() fills undefined with its default',
    epochByDefault,
    undefined,
    pass(new Date(0)),
  ),
  row(
    'date() keeps a present date over its default',
    epochByDefault,
    now,
    pass(now),
  ),
  row(
    'date() fills null with its default',
    epochByDefault,
    null,
    pass(new Date(0)),
  ),
  row(
    'date() with a default fails an invalid date with type',
    epochByDefault,
    new Date(Number.NaN),
    typeFail('date'),
  ),
  ...(
    [
      ['2020-01-31', 'an ISO 8601 string'],
      ['tomorrow', 'a word'],
      ['', 'an empty string'],
      ['  ', 'a blank string'],
      [0, 'a timestamp'],
      [Number.NaN, 'NaN'],
      [new Date(''), 'an invalid date'],
      [true, 'a boolean'],
      [{}, 'a plain object'],
      [[2020], 'an array'],
      [Symbol('s'), 'a symbol'],
      [1n, 'a bigint'],
      [() => 0, 'a function'],
    ] satisfies [unknown, string][]
  ).map(([input, label]) =>
    row(`date() fails ${label} with type`, date(), input, typeFail('date'), {
      field: 'start',
    }),
  ),
];

// Tests called directly

const builtInTests: [string, Validator, Record<string, unknown>][] = [
  ['min', untyped(min(0, 'failed')), { min: 0, amount: Number.NaN }],
  ['max', untyped(max(1, 'failed')), { max: 1, amount: Number.NaN }],
  ['exact', untyped(exact(0, 'failed')), { exact: 0, amount: Number.NaN }],
  ['oneOf', untyped(oneOf(['a'], 'failed')), { values: ['a'] }],
  ['integer', untyped(integer('failed')), {}],
  ['email', untyped(email('failed')), {}],
  ['matches', untyped(matches(/.*/, 'failed')), { pattern: /.*/ }],
  ['url', untyped(url('failed')), { protocols: ['http:', 'https:'] }],
  ['uuid', untyped(uuid('failed')), {}],
  ['minDate', untyped(minDate(new Date(0), 'failed')), { min: new Date(0) }],
  ['maxDate', untyped(maxDate(new Date(0), 'failed')), { max: new Date(0) }],
];

enum TestValue {
  One,
  Two,
  Three,
}

const exactlyFive = untyped(exact(5, 'exact:{exact}'));

const testRows: Row[] = [
  ...builtInTests.flatMap(([code, validate, params]) =>
    [null, undefined].map((input) =>
      row(
        `${code}() called directly fails ${String(input)}`,
        validate,
        input,
        fail(code, params, 'failed'),
      ),
    ),
  ),
  row(
    "min() checks '' as a string",
    untyped(min(1, 'min')),
    '',
    fail('min', { min: 1, amount: 0 }, 'min'),
  ),
  row("max() checks '' as a string", untyped(max(1, 'max')), '', pass('')),
  row(
    "exact() checks '' as a string",
    untyped(exact(0, 'exact')),
    '',
    pass(''),
  ),
  row(
    "matches() checks '' as a string",
    untyped(matches(/^$/, 'matches')),
    '',
    pass(''),
  ),
  row(
    "email() checks '' as a string",
    untyped(email('email')),
    '',
    fail('email', {}, 'email'),
  ),
  row(
    "url() checks '' as a string",
    untyped(url('url')),
    '',
    fail('url', { protocols: ['http:', 'https:'] }, 'url'),
  ),
  row(
    "uuid() checks '' as a string",
    untyped(uuid('uuid')),
    '',
    fail('uuid', {}, 'uuid'),
  ),
  row(
    'exact() passes a string of its length',
    exactlyFive,
    'hello',
    pass('hello'),
  ),
  row(
    'exact() fails a string of another length',
    exactlyFive,
    'foo',
    fail('exact', { exact: 5, amount: 3 }, 'exact:5'),
  ),
  row('exact() passes its number', exactlyFive, 5, pass(5)),
  row(
    'exact() fails another number',
    exactlyFive,
    4,
    fail('exact', { exact: 5, amount: 4 }, 'exact:5'),
  ),
  row(
    'exact() passes an array of its length',
    exactlyFive,
    Array.from({ length: 5 }),
    pass([undefined, undefined, undefined, undefined, undefined]),
  ),
  row(
    'exact() fails an array of another length',
    exactlyFive,
    Array.from({ length: 2 }),
    fail('exact', { exact: 5, amount: 2 }, 'exact:5'),
  ),
  row(
    'oneOf() fails a string outside its values',
    untyped(oneOf<string>(['foo', 'bar', 'baz'], 'oneOf:{values}')),
    'asdf',
    fail('oneOf', { values: ['foo', 'bar', 'baz'] }, 'oneOf:foo,bar,baz'),
  ),
  row(
    'oneOf() passes one of its numbers',
    untyped(oneOf([2, 4, 6], 'oneOf:{values}')),
    4,
    pass(4),
  ),
  row(
    'oneOf() passes false in its values',
    untyped(oneOf([false], 'oneOf:{values}')),
    false,
    pass(false),
  ),
  row(
    'oneOf() passes a TypeScript enum value',
    untyped(
      oneOf([TestValue.One, TestValue.Two, TestValue.Three], 'oneOf:{values}'),
    ),
    TestValue.Three,
    pass(TestValue.Three),
  ),
  row(
    'oneOf() passes a date equal to one of its dates',
    untyped(oneOf([new Date(0), new Date(1)], 'oneOf:{values}')),
    new Date(0),
    pass(new Date(0)),
  ),
];

// Missing values, defaults and optional()

const typeValidators: [string, Validator][] = [
  ['string()', string()],
  ['string() with trim', string(trim)],
  ['number()', number()],
  ['date()', date()],
  ['boolean()', boolean()],
  ['array()', array()],
  ['object()', object({ name: string() })],
];

const notOk: Validator<string, string> = async (value, field) =>
  value === 'ok'
    ? valid({ value, field })
    : invalid({ code: 'custom', message: 'not ok', value, field });

const atLeastThree = string(min(3, 'min'));
const xByDefault = string({ default: 'x' });
const oneByDefault = number({ default: 1 });

const missingRows: Row[] = [
  ...typeValidators.flatMap(([name, validate]) =>
    [undefined, null].map((input) =>
      row(
        `${name} fails ${String(input)} with required`,
        validate,
        input,
        required(),
        { field: 'field' },
      ),
    ),
  ),
  row('number() passes zero', number(), 0, pass(0)),
  row('boolean() without a config passes false', boolean(), false, pass(false)),
  row('string() passes an empty string', string(), '', pass('')),
  row(
    'string() passes a blank string it trims to empty',
    string(trim),
    '  ',
    pass(''),
  ),
  row('array() passes an empty array', array(), [], pass([])),
  row(
    'string() without tests words a missing value from its messages',
    string({ messages: { required: 'Enter a name.' } }),
    undefined,
    required('Enter a name.'),
  ),
  row(
    'number() words a missing value with a message function',
    number({ messages: { required: ({ field }) => `${String(field)}?` } }),
    undefined,
    required('age?'),
    { field: 'age' },
  ),
  row(
    'number() fills the field into its required message',
    number({ messages: { required: '{field} is required.' } }),
    null,
    required('age is required.'),
    { field: 'age' },
  ),
  row(
    'array() words a missing value from its messages',
    array({ messages: { required: 'Pick some.' } }),
    null,
    required('Pick some.'),
  ),
  row(
    'number() fails a missing value without errors',
    number(),
    undefined,
    required(),
    { field: 'age' },
  ),
  row(
    'array() of items fails a missing value without errors',
    array(string()),
    null,
    required(),
  ),
  row('string() with tests fails null', atLeastThree, null, required()),
  row(
    'string() runs its tests on an empty string',
    atLeastThree,
    '',
    fail('min', { min: 3, amount: 0 }, 'min'),
  ),
  row(
    'string() fails a short string',
    atLeastThree,
    'ab',
    fail('min', { min: 3, amount: 2 }, 'min'),
  ),
  row('string() passes a string at its min', atLeastThree, 'abc', pass('abc')),
  row(
    'string() fills undefined with its default before optional()',
    xByDefault,
    undefined,
    pass('x'),
  ),
  row('number() fills null with its default', oneByDefault, null, pass(1)),
  row(
    'array() without an item validator fills null with its default',
    array({ default: ['a'] }),
    null,
    pass(['a']),
  ),
  row('string() fills null with its default', xByDefault, null, pass('x')),
  row(
    'string() keeps an empty string over a one-letter default',
    xByDefault,
    '',
    pass(''),
  ),
  row('number() keeps zero over its default', oneByDefault, 0, pass(0)),
  row(
    'array() of strings keeps an empty array over its default',
    array(string(), { default: ['a'] }),
    [],
    pass([]),
  ),
  row(
    'a custom validator gets undefined',
    notOk,
    undefined,
    fail('custom', {}, 'not ok'),
    { field: 'name' },
  ),
  row(
    'a custom validator gets null',
    notOk,
    null,
    fail('custom', {}, 'not ok'),
  ),
  row(
    'a custom validator fails an empty string',
    notOk,
    '',
    fail('custom', {}, 'not ok'),
  ),
  row('a custom validator passes its value', notOk, 'ok', pass('ok')),
];

// Arrays

const threeLetterWords = array(
  string(min(3, 'min:{min}')),
  { messages: { required: 'required' } },
  min(1, 'min:{min}'),
);
const helloListByDefault = array(string(min(5, 'min:{min}')), {
  default: ['hello'],
});
const oneItem = array(string(), max(1, 'max:{max}'), min(1, 'min:{min}'));
const pickSome = array({ messages: { required: 'Pick some.' } });

const arrayRows: Row[] = [
  row(
    'array() passes items that pass',
    threeLetterWords,
    ['foo', 'bar', 'baz'],
    pass(['foo', 'bar', 'baz']),
  ),
  row('array() fails null with required', threeLetterWords, null, required()),
  row(
    'array() fails undefined with required',
    threeLetterWords,
    undefined,
    required(),
  ),
  row(
    'array() runs its tests on an empty array',
    threeLetterWords,
    [],
    fail('min', { min: 1, amount: 0 }, 'min:1'),
  ),
  row(
    'array() fails a string with type',
    threeLetterWords,
    '',
    typeFail('array'),
  ),
  row(
    'array() fails an object with type',
    threeLetterWords,
    {},
    typeFail('array'),
  ),
  row(
    'array() fails with items when an item fails',
    threeLetterWords,
    ['foo', 'ba'],
    fail('items', {}, 'items', [
      null,
      child('[1]', 'min', { min: 3, amount: 2 }, 'min:3'),
    ]),
  ),
  row(
    'array() of objects nests each item failure',
    array(
      object({
        username: string(
          { messages: { required: 'required' } },
          min(3, 'min:{min}'),
        ),
      }),
      min(2, 'min:{min}'),
      max(10, 'max:{max}'),
    ),
    [{}, { username: 'foo' }, { username: 'ab' }],
    fail('items', {}, 'items', [
      child('[0]', 'properties', {}, 'properties', {
        username: child('[0].username', 'required'),
      }),
      null,
      child('[2]', 'properties', {}, 'properties', {
        username: child('[2].username', 'min', { min: 3, amount: 2 }, 'min:3'),
      }),
    ]),
  ),
  row(
    'array() fills undefined with its default',
    helloListByDefault,
    undefined,
    pass(['hello']),
  ),
  row(
    'array() with item tests fills null with its default',
    helloListByDefault,
    null,
    pass(['hello']),
  ),
  row(
    'array() with item tests keeps an empty array over its default',
    helloListByDefault,
    [],
    pass([]),
  ),
  row(
    'array() keeps a present array over its default',
    helloListByDefault,
    ['other'],
    pass(['other']),
  ),
  row(
    'array() without an item validator fails undefined',
    array(),
    undefined,
    required(),
  ),
  row(
    'array() returns the transformed items',
    array(string(trim)),
    [' a ', 'b '],
    pass(['a', 'b']),
  ),
  row(
    'array() takes a test right after the item validator',
    oneItem,
    ['a'],
    pass(['a']),
  ),
  row(
    'array() runs the tests after the item validator in order',
    oneItem,
    ['a', 'b'],
    fail('max', { max: 1, amount: 2 }, 'max:1'),
  ),
  row(
    'array() without an item validator takes any items',
    pickSome,
    ['a', 1],
    pass(['a', 1]),
  ),
  row(
    'array() without an item validator takes a config',
    pickSome,
    null,
    required('Pick some.'),
  ),
  row(
    'array() requires each item',
    array(string()),
    ['a', undefined, null],
    fail('items', {}, 'items', [
      null,
      child('[1]', 'required'),
      child('[2]', 'required'),
    ]),
  ),
  row(
    'array() of optional() items passes missing items',
    array(optional(string())),
    ['a', undefined, null],
    pass(['a', undefined, null]),
  ),
];

// Objects

const adult = object({
  username: string(
    { messages: { required: 'Username is required.' } },
    min(5, 'At least five characters.'),
    max(20, 'At most 20 characters.'),
  ),
  age: number(
    { messages: { required: 'Must enter your age.' } },
    min(18, 'At least 18 years old'),
    max(150, 'Are you really over 150 years old?'),
    integer('Half-years do not count.'),
  ),
});
const anyObject = object({});
const inheritedSchema = Object.assign(
  Object.create({ name: string({ messages: { required: 'required' } }) }),
  { age: number() },
);
const notXWithConfig = object(
  { name: string() },
  { messages: { required: 'Enter a person.' } },
  check((value) => value.name !== 'x', 'x', 'Not x.'),
);
const notXOrY = object(
  { name: string() },
  check((value) => value.name !== 'x', 'x', 'Not x.'),
  check((value) => value.name !== 'y', 'y', 'Not y.'),
);
const contact = object({
  name: string(),
  nickname: optional(string()),
  address: object({ zip: string() }),
  billing: optional(object({ zip: string() })),
});
const person = object({
  person: object({
    firstName: string({ messages: { required: 'required' } }),
    lastName: string({ messages: { required: 'required' } }),
    age: optional(number()),
  }),
});
const settings = object({
  theme: string({ default: 'light' }),
  note: optional(string()),
});
const display = object({
  display: object({ theme: string({ default: 'light' }) }),
});
const lightTheme = object({ theme: string({ default: 'light' }) });
const named = object({ name: string() });
const signup = object(
  {
    password: string({ messages: { required: 'Required' } }),
    confirm: string({ messages: { required: 'Required' } }),
  },
  check(
    'confirm',
    (value) => value.confirm === value.password,
    'match',
    'Must match.',
  ),
);
const darkFailure = fail('dark', {}, 'dark');

const objectRows: Row[] = [
  row(
    'object() passes fields that pass',
    adult,
    { username: 'hello', age: 20 },
    pass({ username: 'hello', age: 20 }),
  ),
  row(
    'object() fails with properties when a field fails',
    adult,
    { username: 'hello', age: null },
    fail('properties', {}, 'properties', {
      age: child('age', 'required', {}, 'Must enter your age.'),
    }),
  ),
  row(
    'object() of no fields passes an object as empty',
    anyObject,
    { foo: 'bar' },
    pass({}),
  ),
  row(
    'object() of no fields passes a date as empty',
    anyObject,
    new Date(0),
    pass({}),
  ),
  row(
    'object() of no fields fails a number with type',
    anyObject,
    1,
    typeFail('object'),
  ),
  row(
    'object() skips inherited properties of its schema',
    object(inheritedSchema),
    { name: undefined, age: 22 },
    pass({ age: 22 }),
  ),
  row(
    'object() reports a field named like Object.prototype as missing',
    object({
      constructor: string({ messages: { required: 'Required' } }),
      toString: string({ messages: { required: 'Required' } }),
    }),
    {},
    fail('properties', {}, 'properties', {
      constructor: child('constructor', 'required', {}, 'Required'),
      toString: child('toString', 'required', {}, 'Required'),
    }),
  ),
  row(
    'object() reports a field the input only inherits as missing',
    object({ name: string({ messages: { required: 'Required' } }) }),
    Object.create({ name: 'inherited' }),
    fail('properties', {}, 'properties', {
      name: child('name', 'required', {}, 'Required'),
    }),
  ),
  row(
    'object() passes a nested object',
    person,
    { person: { firstName: 'foo', lastName: 'bar' } },
    pass({ person: { firstName: 'foo', lastName: 'bar', age: undefined } }),
  ),
  row(
    'object() nests a nested object failure',
    person,
    { person: { firstName: 'foo', age: 22 } },
    fail('properties', {}, 'properties', {
      person: child('person', 'properties', {}, 'properties', {
        lastName: child('person.lastName', 'required'),
      }),
    }),
  ),
  row(
    'object() builds undefined from its children',
    settings,
    undefined,
    pass({ theme: 'light', note: undefined }),
    { field: 'settings' },
  ),
  row(
    'object() builds null from its children',
    settings,
    null,
    pass({ theme: 'light', note: undefined }),
  ),
  row('object() of no fields builds undefined', anyObject, undefined, pass({})),
  row(
    'object() builds a missing nested object whose children have defaults',
    display,
    {},
    pass({ display: { theme: 'light' } }),
  ),
  row(
    'object() builds a missing object with nested defaults',
    display,
    undefined,
    pass({ display: { theme: 'light' } }),
  ),
  row(
    'object() fails a missing object with required when a child fails',
    object({
      name: string({ messages: { required: 'Enter a name.' } }),
      theme: string({ default: 'light' }),
    }),
    undefined,
    required(),
    { field: 'person' },
  ),
  row(
    'object() words a missing object it cannot build from its messages',
    object({ name: string() }, { messages: { required: 'Enter a person.' } }),
    null,
    required('Enter a person.'),
  ),
  row(
    'object() runs its collection tests on a built object',
    object(
      { theme: string({ default: 'light' }) },
      check((value) => value.theme === 'dark', 'dark'),
    ),
    undefined,
    darkFailure,
    { optional: darkFailure },
  ),
  row(
    'object() gives the built object for undefined',
    lightTheme,
    undefined,
    pass({ theme: 'light' }),
  ),
  row(
    'object() that cannot build fails undefined',
    named,
    undefined,
    required(),
  ),
  row('object() that cannot build fails null', named, null, required()),
  row(
    'object() takes a config as its second argument',
    notXWithConfig,
    null,
    required('Enter a person.'),
    { field: 'person' },
  ),
  row(
    'object() runs a test after its config',
    notXWithConfig,
    { name: 'x' },
    fail('x', {}, 'Not x.'),
  ),
  row(
    'object() with a config and a test passes',
    notXWithConfig,
    { name: 'a' },
    pass({ name: 'a' }),
  ),
  row(
    'object() with a test second fails undefined with required',
    notXOrY,
    undefined,
    required(),
  ),
  row(
    'object() takes a test as its second argument',
    notXOrY,
    { name: 'x' },
    fail('x', {}, 'Not x.'),
  ),
  row(
    'object() runs the test after its second argument',
    notXOrY,
    { name: 'y' },
    fail('y', {}, 'Not y.'),
  ),
  row(
    'object() requires nested objects and fields',
    contact,
    {},
    fail('properties', {}, 'properties', {
      name: child('name', 'required'),
      address: child('address', 'required'),
    }),
  ),
  row(
    'object() passes missing optional() fields',
    contact,
    { name: 'a', address: { zip: '1' } },
    pass({
      name: 'a',
      nickname: undefined,
      address: { zip: '1' },
      billing: undefined,
    }),
  ),
  row(
    'object() requires the fields of a present optional() object',
    contact,
    { name: 'a', address: { zip: '1' }, billing: {} },
    fail('properties', {}, 'properties', {
      billing: child('billing', 'properties', {}, 'properties', {
        zip: child('billing.zip', 'required'),
      }),
    }),
  ),
  row(
    'object() puts a collection test error on the named field',
    signup,
    { password: 'secret', confirm: 'other' },
    fail('properties', {}, 'properties', {
      confirm: child('confirm', 'match', {}, 'Must match.'),
    }),
  ),
  row(
    'object() passes when every collection test passes',
    signup,
    { password: 'secret', confirm: 'secret' },
    pass({ password: 'secret', confirm: 'secret' }),
  ),
  row(
    'object() puts the message on the object when the check names no field',
    object(
      { min: number(), max: number() },
      check(
        (value) => (value.min ?? 0) <= (value.max ?? 0),
        'range',
        '{field}: min must not exceed max.',
      ),
    ),
    { min: 3, max: 1 },
    fail('range', {}, 'range: min must not exceed max.'),
    { field: 'range' },
  ),
  row(
    'object() nests a collection test error when the check names a path',
    object(
      {
        billing: object({ zip: string() }),
        shipping: object({ zip: string() }),
      },
      check(
        ['shipping', 'zip'],
        (value) => value.shipping?.zip === value.billing?.zip,
        'match',
        'Must match the billing zip.',
      ),
    ),
    { billing: { zip: '12345' }, shipping: { zip: '54321' } },
    fail('properties', {}, 'properties', {
      shipping: child('shipping', 'properties', {}, 'properties', {
        zip: child('shipping.zip', 'match', {}, 'Must match the billing zip.'),
      }),
    }),
  ),
  row(
    'object() stops at the first failing collection test',
    object(
      { name: string() },
      createValidatorTest('first', () => false, 'First.'),
      createValidatorTest('second', () => false, 'Second.'),
    ),
    { name: 'a' },
    fail('first', {}, 'First.'),
  ),
  row(
    'string() stops at a custom test that fails between built-in tests',
    string(
      min(1, 'min'),
      async (value, field) =>
        invalid({ code: 'custom', message: 'custom', value, field }),
      min(10, 'min'),
    ),
    'abc',
    fail('custom', {}, 'custom'),
  ),
  row(
    'string() with trim gives ~standard the parsed value',
    string(trim),
    ' a ',
    pass('a'),
  ),
];

const rows: Row[] = [
  ...stringRows,
  ...numberRows,
  ...booleanRows,
  ...dateRows,
  ...testRows,
  ...missingRows,
  ...arrayRows,
  ...objectRows,
];

const isMissing = (input: unknown) => input === undefined || input === null;

/**
 * Each wrap runs every row again around its validator. `optional()` passes a
 * missing input the validator fails, unless the row says otherwise.
 */
const wraps: {
  name: string;
  wrap: (validator: Validator) => Validator;
  expect: (row: Row) => Expect;
}[] = [
  {
    name: 'as is',
    wrap: (validator) => validator,
    expect: (each) => each.expect,
  },
  {
    name: 'in optional()',
    wrap: optional,
    expect: (each) =>
      each.optional ??
      (isMissing(each.input) && 'code' in each.expect
        ? pass(each.input)
        : each.expect),
  },
];

/** The whole result a row expects from the safe call. */
const resultOf = (expect: Expect, field: string | undefined): Result =>
  'value' in expect
    ? { state: 'valid', value: expect.value, field }
    : { state: 'invalid', ...expect, field };

const isObject = (entry: unknown): entry is object =>
  typeof entry === 'object' && entry !== null;

const isFailure = (entry: unknown): entry is Failure<unknown> =>
  isObject(entry) && Reflect.get(entry, 'state') === 'invalid';

/** The entries of an `items` or `properties` failure's errors tree. */
const childrenOf = ({
  code,
  errors,
}: Failure<unknown>): [PropertyKey, unknown][] => {
  if ((code !== 'items' && code !== 'properties') || !isObject(errors)) {
    return [];
  }

  return Array.isArray(errors) ? [...errors.entries()] : Object.entries(errors);
};

/**
 * The Standard Schema issues a failure gives: one for each leaf of its errors
 * tree, with the path to it.
 */
function issuesOf(made: Failure<unknown>, path: PropertyKey[] = []): unknown[] {
  const found = childrenOf(made).flatMap(([key, entry]) =>
    isFailure(entry) ? issuesOf(entry, [...path, key]) : [],
  );
  if (found.length > 0) {
    return found;
  }

  const { message, code, params } = made;
  return path.length > 0
    ? [{ message, code, params, path }]
    : [{ message, code, params }];
}

/** What `~standard.validate` gives for a result. */
const standardOf = (result: Result) =>
  result.state === 'valid'
    ? { value: result.value }
    : { issues: issuesOf(result) };

const cases = wraps.flatMap(({ name, wrap, expect }) =>
  rows.map((each) => ({
    name: `${each.case}, ${name}`,
    validator: wrap(each.validator),
    input: each.input,
    field: each.field,
    expect: resultOf(expect(each), each.field),
  })),
);

test.each(cases)('$name', async ({ validator, input, field, expect }) => {
  assert.deepEqual(await validator(input, field), expect, 'safe call');

  const parsed = await parse(validator, input, field).then(
    (value) => ({ value }),
    (error: unknown) =>
      error instanceof FailureError ? { failure: error.failure } : { error },
  );
  assert.deepEqual(
    parsed,
    expect.state === 'valid' ? { value: expect.value } : { failure: expect },
    'parse()',
  );

  // createValidator() returns a type validator as it is and gives a test its
  // own ~standard. ~standard.validate calls the validator without a field.
  const schema = createValidator(validator)['~standard'];
  const unnamed = field === undefined ? expect : await validator(input);
  assert.include(schema, { version: 1, vendor: 'validator-fns' });
  assert.deepEqual<unknown>(
    await schema.validate(input),
    standardOf(unnamed),
    '~standard',
  );
});
