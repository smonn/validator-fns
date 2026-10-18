import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import { maxDate, minDate } from '../src/index.js';

const invalidDate = new Date('');

/** The limit `minDate()` reads, from the params of its failure. */
async function parsedDate(limit: Date | string | number) {
  const result = await minDate(limit)(new Date(-8.64e15));
  assert(result.state === 'invalid');
  return result.params['min'];
}

test('minDate() keeps a date limit as it is, from any realm', async () => {
  const now = new Date();
  const foreign: Date = runInNewContext('new Date(0)');
  assert.strictEqual(await parsedDate(now), now);
  assert.strictEqual(await parsedDate(foreign), foreign);
});

// Built in the test rather than in a table at module scope, so mutation
// testing sees the limit parsing each case covers.
test('minDate() reads timestamps and ISO 8601 strings as its limit', async () => {
  const cases: [string | number, Date][] = [
    [0, new Date(0)],
    ['2020', new Date(2020, 0)],
    ['2020-01', new Date(2020, 0)],
    ['2020-01-31', new Date(2020, 0, 31)],
    ['2020-02-29', new Date(2020, 1, 29)],
    ['2000-02-29', new Date(2000, 1, 29)],
    ['2020-04-30', new Date(2020, 3, 30)],
    ['2020-12-31T23:59:59', new Date(2020, 11, 31, 23, 59, 59)],
    ['2020-01-31 12:45', new Date(2020, 0, 31, 12, 45)],
    ['2020-01-31T12:45:32', new Date(2020, 0, 31, 12, 45, 32)],
    ['2020-01-31T12:45:32Z', new Date(Date.UTC(2020, 0, 31, 12, 45, 32))],
    ['2020-01-31T12:45:32+01:30', new Date(Date.UTC(2020, 0, 31, 14, 15, 32))],
    ['2020-01-31T12:45:32-0200', new Date(Date.UTC(2020, 0, 31, 10, 45, 32))],
    ['2020-01-31T12:45:32.123', new Date(2020, 0, 31, 12, 45, 32, 123)],
    [
      '2020-01-31T12:45:32.001242Z',
      new Date(Date.UTC(2020, 0, 31, 12, 45, 32, 1.242)),
    ],
  ];
  for (const [limit, parsed] of cases) {
    assert.deepEqual(await parsedDate(limit), parsed, JSON.stringify(limit));
  }
});

test('minDate() and maxDate() throw for a limit that is not a valid date', () => {
  const unreadable: unknown[] = [
    // Missing
    null,
    undefined,
    // Strings that aren't ISO 8601
    '',
    '  ',
    'garbage',
    '2020-01-01x',
    'tomorrow',
    '12/31/2020',
    // ISO 8601 strings with a part out of its range (#787)
    '2020-00',
    '2020-13',
    '2020-01-00',
    '2020-01-32',
    '2020-02-30',
    '2021-02-29',
    '1900-02-29',
    '2020-04-31',
    '2020-01-01T24:00',
    '2020-01-01T00:00:00+24:00',
    '2020-01-01T00:00:00+29:59',
    // Timestamps out of a date's range
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    9e15,
    // An invalid date, and input that isn't a date, number, or string
    invalidDate,
    runInNewContext("new Date('')"),
    true,
    {},
    [2020],
    Symbol('s'),
    1n,
    () => 0,
  ];
  for (const limit of unreadable) {
    // Reflect.apply lets the test pass limits the types reject.
    // The message tells this throw apart from a crash while reading the limit.
    assert.throws(
      () => Reflect.apply(minDate, undefined, [limit]),
      TypeError,
      '`limit` must be a valid date',
    );
    assert.throws(
      () => Reflect.apply(maxDate, undefined, [limit]),
      TypeError,
      '`limit` must be a valid date',
    );
  }
});
