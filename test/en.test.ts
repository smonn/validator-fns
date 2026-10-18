import { assert, expectTypeOf, test } from 'vitest';
import { en } from '../src/en.js';
import {
  array,
  createValidatorTest,
  type BuiltInCode,
  date,
  email,
  exact,
  integer,
  matches,
  max,
  maxDate,
  type Messages,
  messageTree,
  min,
  minDate,
  number,
  object,
  oneOf,
  string,
  url,
  uuid,
  type Validator,
  withMessages,
} from '../src/index.js';

const day = new Date('2026-10-18T00:00:00.000Z');

// Every built-in code, through a validator that raises it, and its English.
const rows: [BuiltInCode, Validator, unknown, string][] = [
  ['min', number(min(3)), 2, 'Must be at least 3.'],
  ['min', string(min(3)), 'ab', 'Must be at least 3 characters.'],
  ['min', array(number(), min(3)), [1], 'Must have at least 3 items.'],
  ['max', number(max(3)), 4, 'Must be at most 3.'],
  ['max', string(max(1)), 'ab', 'Must be at most 1 characters.'],
  ['max', array(number(), max(1)), [1, 2], 'Must have at most 1 items.'],
  ['exact', number(exact(3)), 4, 'Must be exactly 3.'],
  ['exact', string(exact(3)), 'ab', 'Must be exactly 3 characters.'],
  ['exact', array(number(), exact(3)), [1], 'Must have exactly 3 items.'],
  [
    'minDate',
    date(minDate(day)),
    new Date(0),
    `Must be on or after ${String(day)}.`,
  ],
  [
    'maxDate',
    date(maxDate(new Date(0))),
    day,
    `Must be on or before ${String(new Date(0))}.`,
  ],
  ['oneOf', string(oneOf(['a', 'b'])), 'c', 'Must be one of a,b.'],
  ['matches', string(matches(/^a/)), 'b', 'Must match /^a/.'],
  ['url', string(url()), 'nope', 'Must be a URL.'],
  ['integer', number(integer()), 1.5, 'Must be a whole number.'],
  ['email', string(email()), 'nope', 'Must be an email address.'],
  ['uuid', string(uuid()), 'nope', 'Must be a UUID.'],
  ['required', string(), undefined, 'Required.'],
  ['type', number(), 'a', 'Must be of type number.'],
  [
    'unknownKeys',
    object({}, { strict: true }),
    { b: 1, c: 2 },
    'Unknown keys: b,c.',
  ],
  ['items', array(number()), ['a'], 'Has invalid items.'],
  ['properties', object({ a: string() }), {}, 'Has invalid fields.'],
];

test.each(rows)(
  'should word %s in English: %s',
  async (code, validator, input, message) => {
    assert.deepInclude(await withMessages(validator, en)(input), {
      code,
      message,
    });
  },
);

test('should have a message for every built-in code and no other', () => {
  const codes = new Set(rows.map(([code]) => code));
  assert.deepEqual(Object.keys(en).toSorted(), [...codes].toSorted());
});

test('should type en as a message for each built-in code', () => {
  expectTypeOf(en).toEqualTypeOf<Messages<BuiltInCode>>();
});

test('should word the children, keep supplied messages and compose with spread', async () => {
  const taken = createValidatorTest<string>(
    'taken',
    (value) => value !== 'bob',
  );
  const form = withMessages(
    object({
      name: string(min(2, 'Name is short.')),
      user: string(taken),
      tags: array(string(min(2))),
    }),
    { ...en, taken: 'Taken.' },
  );
  const result = await form({ name: 'a', user: 'bob', tags: ['x'] });
  assert.deepInclude(result, { message: 'Has invalid fields.' });
  assert.deepEqual<unknown>(messageTree(result), {
    name: 'Name is short.',
    user: 'Taken.',
    tags: ['Must be at least 2 characters.'],
  });
});

test('should not let en be changed', () => {
  assert.isFrozen(en);
});

/** en's message for an amount code, called with `parameters`. */
const amountMessage = (
  code: 'min' | 'max' | 'exact',
  parameters: Record<string, unknown>,
) => {
  const message = en[code];
  return typeof message === 'function'
    ? message({ ...parameters, value: parameters['value'], field: undefined })
    : message;
};

test('should word an amount message without throwing for odd parameters', () => {
  assert.strictEqual(
    amountMessage('min', { min: 1, value: Object.create(null) }),
    'Must have at least 1 items.',
  );
  assert.strictEqual(
    amountMessage('max', { max: Symbol('s'), value: 5 }),
    'Must be at most Symbol(s).',
  );
  assert.strictEqual(
    amountMessage('exact', { exact: Object.create(null), value: 'a' }),
    'Must be exactly [object Object] characters.',
  );
});
