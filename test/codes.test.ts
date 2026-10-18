import { assert, test } from 'vitest';
import {
  array,
  boolean,
  check,
  createTypeValidatorTest,
  createValidatorTest,
  date,
  email,
  exact,
  integer,
  invalid,
  matches,
  max,
  maxDate,
  messageTree,
  min,
  minDate,
  number,
  object,
  oneOf,
  string,
  url,
  uuid,
  valid,
  type Messages,
  type Result,
  type Validator,
} from '../src/index.js';

// Each built-in code, from a validator with no messages, with its params.
const codes: [string, Validator, unknown, Record<string, unknown>][] = [
  ['min', string(min(3)), 'ab', { min: 3, amount: 2 }],
  ['max', number(max(3)), 5, { max: 3, amount: 5 }],
  ['exact', array(number(), exact(2)), [1], { exact: 2, amount: 1 }],
  ['minDate', date(minDate(new Date(10))), new Date(5), { min: new Date(10) }],
  ['maxDate', date(maxDate(new Date(10))), new Date(15), { max: new Date(10) }],
  ['oneOf', boolean(oneOf([true])), false, { values: [true] }],
  ['matches', string(matches(/^a/)), 'b', { pattern: /^a/ }],
  ['url', string(url()), 'x', { protocols: ['http:', 'https:'] }],
  ['integer', number(integer()), 1.5, {}],
  ['email', string(email()), 'x', {}],
  ['uuid', string(uuid()), 'x', {}],
  ['required', string(), undefined, {}],
  ['type', number(), 'abc', { expected: 'number' }],
  ['type', string(), {}, { expected: 'string' }],
  ['type', date(), 'tomorrow', { expected: 'date' }],
  ['type', boolean(), 'false', { expected: 'boolean' }],
  ['type', array(), 'abc', { expected: 'array' }],
  ['type', object({}), [], { expected: 'object' }],
  ['items', array(number()), ['abc'], {}],
  ['properties', object({ a: string() }), {}, {}],
];

test('should fail with the code and its params, and the code as the message', async () => {
  for (const [code, validate, input, params] of codes) {
    const result = await validate(input, 'field');
    assert.deepInclude(
      result,
      { state: 'invalid', code, params, message: code, field: 'field' },
      code,
    );
  }
});

test('should word a failure with the message passed to its test', async () => {
  const messages: [string, Promise<Result>, string][] = [
    [
      'template',
      string(min(3, '{field} needs {min}'))('ab', 'name'),
      'name needs 3',
    ],
    [
      'function',
      string(
        min(
          3,
          (p) =>
            `${String(p.field)} ${String(p.value)} ${p.min} ${String(p.amount)}`,
        ),
      )('ab', 'name'),
      'name ab 3 2',
    ],
    ['url', string(url('{protocols}', ['ftp:']))('x'), 'ftp:'],
    ['integer', number(integer('whole'))(1.5), 'whole'],
  ];
  for (const [label, promise, message] of messages) {
    const result = await promise;
    assert.deepInclude(result, { state: 'invalid', message }, label);
  }
});

test('should word a validator own failures from its messages config', async () => {
  const messages: [string, Promise<Result>, string][] = [
    [
      'required',
      string({ messages: { required: 'Enter it.' } })(undefined),
      'Enter it.',
    ],
    [
      'type',
      number({ messages: { type: 'Not a {expected}.' } })('abc'),
      'Not a number.',
    ],
    [
      'test',
      string({ messages: { min: 'At least {min}.' } }, min(3))('ab'),
      'At least 3.',
    ],
    [
      'items',
      array(number(), { messages: { items: 'Bad items.' } })(['abc']),
      'Bad items.',
    ],
    [
      'array test',
      array(number(), { messages: { max: 'Too many.' } }, max(1))([1, 2]),
      'Too many.',
    ],
    [
      'properties',
      object({ a: string() }, { messages: { properties: 'Fix it.' } })({}),
      'Fix it.',
    ],
    [
      'object type',
      object({ a: string() }, { messages: { type: 'Not an {expected}.' } })([]),
      'Not an object.',
    ],
    [
      'object required',
      object({ a: string() }, { messages: { required: 'Fill in.' } })(null),
      'Fill in.',
    ],
    [
      'object test',
      object(
        { a: string() },
        { messages: { same: 'Not the same.' } },
        check(() => false, 'same'),
      )({ a: 'x' }),
      'Not the same.',
    ],
  ];
  for (const [label, promise, message] of messages) {
    const result = await promise;
    assert.deepInclude(result, { state: 'invalid', message }, label);
  }
});

test('should prefer the message passed to a test over the messages config', async () => {
  const result = await string(
    { messages: { min: 'config' } },
    min(3, 'test'),
  )('ab');
  assert.deepInclude(result, { code: 'min', message: 'test' });
});

test.each(['constructor', 'toString', '__proto__'])(
  'should fall back to the code %s when the messages config lacks it',
  async (code) => {
    const fails = createValidatorTest(code, () => false);
    assert.deepInclude(await string({ messages: {} }, fails)('x'), {
      code,
      message: code,
    });
  },
);

test.each<[string, Messages]>([
  ['constructor', { constructor: 'Own.' }],
  ['__proto__', JSON.parse('{ "__proto__": "Own." }')],
])(
  'should word the code %s from its own messages key',
  async (code, messages) => {
    const fails = createValidatorTest(code, () => false);
    assert.deepInclude(await string({ messages }, fails)('x'), {
      code,
      message: 'Own.',
    });
  },
);

test('should leave children unworded by a container messages config', async () => {
  const messages = { min: 'config', required: 'config', type: 'config' };
  const objectResult = await object(
    { a: string(min(3)), b: string() },
    { messages },
  )({ a: 'ab' });
  assert.deepEqual(messageTree(objectResult), { a: 'min', b: 'required' });

  const arrayResult = await array(number(), { messages })(['abc']);
  assert.deepEqual(messageTree(arrayResult), ['type']);
});

test('should report the issues of a leaf failure with its code and params', async () => {
  assert.deepEqual<unknown>(await string(min(3))['~standard'].validate('ab'), {
    issues: [{ message: 'min', code: 'min', params: { min: 3, amount: 2 } }],
  });
  assert.deepEqual<unknown>(
    await number({ messages: { type: 'Not a number.' } })['~standard'].validate(
      'abc',
    ),
    {
      issues: [
        {
          message: 'Not a number.',
          code: 'type',
          params: { expected: 'number' },
        },
      ],
    },
  );
});

test('should report only the children of a container in its issues', async () => {
  assert.deepEqual<unknown>(
    await object({ a: string(min(3)), b: array(number()) })[
      '~standard'
    ].validate({ a: 'ab', b: [1, 'x'] }),
    {
      issues: [
        {
          message: 'min',
          code: 'min',
          params: { min: 3, amount: 2 },
          path: ['a'],
        },
        {
          message: 'type',
          code: 'type',
          params: { expected: 'number' },
          path: ['b', 1],
        },
      ],
    },
  );
});

test('should fail a custom test with its own code', async () => {
  const even = createValidatorTest('even', (value: number) => value % 2 === 0);
  assert.deepInclude(await number(even)(3), {
    code: 'even',
    params: {},
    message: 'even',
  });

  const between = createValidatorTest(
    'between',
    (value: number) => value > 1 && value < 3,
    '{value} not in {low}..{high}',
    () => ({ low: 1, high: 3 }),
  );
  assert.deepInclude(await between(5), {
    code: 'between',
    params: { low: 1, high: 3 },
    message: '5 not in 1..3',
  });

  const unworded = createValidatorTest(
    'between',
    (value: number) => value > 1,
    undefined,
    () => ({ low: 1 }),
  );
  assert.deepInclude(await unworded(0), {
    code: 'between',
    params: { low: 1 },
    message: 'between',
  });
});

type Signup = { password: string; confirm: string };

const same = (value: Signup) => value.password === value.confirm;
const input = { password: 'a', confirm: 'b' };

test('should fail check() with its own code', async () => {
  assert.deepInclude(await check(same, 'same')(input, 'signup'), {
    code: 'same',
    params: {},
    message: 'same',
    field: 'signup',
  });
  assert.deepInclude(await check(same, 'same', 'Must match.')(input), {
    code: 'same',
    message: 'Must match.',
  });
});

test('should nest a check() failure at its path in a properties failure', async () => {
  const atKey = await check('confirm', same, 'same')(input);
  assert.deepInclude(atKey, {
    code: 'properties',
    params: {},
    message: 'properties',
  });
  assert.deepEqual(messageTree(atKey), { confirm: 'same' });

  const worded = await object(
    { password: string(), confirm: string() },
    { messages: { properties: 'Fix the form.' } },
    check(['confirm'], same, 'same', 'Must match.'),
  )(input);
  assert.deepInclude(worded, { message: 'Fix the form.' });
  assert.deepEqual(messageTree(worded), { confirm: 'Must match.' });
});

test('should make a failure with a custom code through invalid()', async () => {
  assert.deepEqual(await invalid({ code: 'taken', field: 'name' }), {
    state: 'invalid',
    code: 'taken',
    params: {},
    message: 'taken',
    field: 'name',
    errors: undefined,
  });
  assert.deepInclude(
    await invalid({
      code: 'taken',
      params: { name: 'bob' },
      message: '{name} is taken, {field}: {value}',
      value: 'x',
      field: 'user',
    }),
    { params: { name: 'bob' }, message: 'bob is taken, user: x' },
  );
});

const money = createTypeValidatorTest(
  {
    parser: async (value: unknown, field?: string) =>
      typeof value === 'number' || value === undefined
        ? valid({ value, field })
        : invalid({ code: 'type', params: { expected: 'money' }, field }),
  },
  (value: number | null | undefined) => value,
);

test('should word a custom type validator from its messages config', async () => {
  const validate = money({
    messages: { required: 'Enter an amount.', type: 'Not {expected}.' },
  });
  assert.deepInclude(await validate(undefined), {
    code: 'required',
    message: 'Enter an amount.',
  });
  assert.deepInclude(await validate('x'), {
    code: 'type',
    params: { expected: 'money' },
    message: 'Not money.',
  });
  assert.deepInclude(await money()('x'), { code: 'type', message: 'type' });
});

test('should keep the message of a worded parser failure over the messages config', async () => {
  const worded = createTypeValidatorTest(
    {
      parser: async (value: unknown, field?: string) =>
        invalid({ code: 'type', message: 'Not money.', value, field }),
    },
    (value: number | null | undefined) => value,
  );
  assert.deepInclude(await worded({ messages: { type: 'config' } })('x'), {
    code: 'type',
    message: 'Not money.',
  });
});
