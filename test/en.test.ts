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
  ['min', string(min(1)), '', 'Must be at least 1 character.'],
  ['min', array(number(), min(3)), [1], 'Must have at least 3 items.'],
  ['min', array(number(), min(1)), [], 'Must have at least 1 item.'],
  ['max', number(max(3)), 4, 'Must be at most 3.'],
  ['max', string(max(1)), 'ab', 'Must be at most 1 character.'],
  ['max', string(max(2)), 'abc', 'Must be at most 2 characters.'],
  ['max', array(number(), max(1)), [1, 2], 'Must have at most 1 item.'],
  ['max', array(number(), max(2)), [1, 2, 3], 'Must have at most 2 items.'],
  ['exact', number(exact(3)), 4, 'Must be exactly 3.'],
  ['exact', string(exact(1)), 'ab', 'Must be exactly 1 character.'],
  ['exact', string(exact(3)), 'ab', 'Must be exactly 3 characters.'],
  ['exact', array(number(), exact(1)), [], 'Must have exactly 1 item.'],
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

test.each(
  rows.map(([code, validator, input, message]) => [
    code,
    message,
    validator,
    input,
  ]),
)(
  'should word %s in English as %s',
  async (code, message, validator, input) => {
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

const taken = createValidatorTest<string>('taken', (value) => value !== 'bob');
const signup = object({
  name: string(min(2, 'Name is short.')),
  user: string(taken),
  tags: array(string(min(2))),
});
const input = { name: 'a', user: 'bob', tags: ['x'] };

test('should word the children of a container', async () => {
  const result = await withMessages(signup, en)(input);
  assert.deepInclude(result, { message: 'Has invalid fields.' });
  assert.deepInclude(messageTree(result), {
    tags: ['Must be at least 2 characters.'],
  });
});

test('should keep a message passed to a test over en', async () => {
  const result = await withMessages(signup, en)(input);
  assert.deepInclude(messageTree(result), { name: 'Name is short.' });
});

test('should word a custom code when en is spread with it', async () => {
  const result = await withMessages(signup, { ...en, taken: 'Taken.' })(input);
  assert.deepInclude(messageTree(result), { user: 'Taken.' });
});

test('should not let en be changed', () => {
  assert.isFrozen(en);
});

const { proxy: revokedList, revoke } = Proxy.revocable([], {});
revoke();

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

test.each<[string, Record<string, unknown>, string]>([
  ['null', { min: 1, value: null }, 'Must be at least 1.'],
  [
    'a null-prototype object',
    { min: 2, value: Object.create(null) },
    'Must be at least 2.',
  ],
  ['a revoked Proxy', { min: 2, value: revokedList }, 'Must be at least 2.'],
])(
  'should word an amount with the generic message when the value is %s',
  (_, parameters, message) => {
    assert.strictEqual(amountMessage('min', parameters), message);
  },
);

test('should word an amount message without throwing when the limit has no string form', () => {
  assert.strictEqual(
    amountMessage('max', { max: Symbol('s'), value: 5 }),
    'Must be at most Symbol(s).',
  );
  assert.strictEqual(
    amountMessage('exact', { exact: Object.create(null), value: 'a' }),
    'Must be exactly [object Object] characters.',
  );
});
