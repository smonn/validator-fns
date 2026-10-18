import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import { maxDate, minDate } from '../src/index.js';

const invalidDate = new Date('');

/**
 * A date in the years 0 to 99, which `new Date()` and `Date.UTC()` read as
 * 1900 to 1999: local midnight, or with `utc`, UTC midnight.
 */
function earlyDate(year: number, month: number, day: number, utc = false) {
  const early = new Date(0);
  if (utc) {
    early.setUTCFullYear(year, month, day);
  } else {
    early.setFullYear(year, month, day);
    early.setHours(0, 0, 0, 0);
  }
  return early;
}

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
    ['0050-01-01', earlyDate(50, 0, 1)],
    ['0000-02-29', earlyDate(0, 1, 29)],
    ['0099-12-31T00:00:00Z', earlyDate(99, 11, 31, true)],
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

// The calendar repeats every 400 years, so these hold whichever way an offset
// moves the time.
test('minDate() moves the years 0 to 99 across a day by an offset as it does 400 years later', async () => {
  const fourHundredYears = 146_097 * 86_400_000;
  const times = ['02-28T23:30:00', '03-01T00:30:00'];
  for (const time of times) {
    for (const offset of ['+01:00', '-01:00']) {
      const early = await parsedDate(`0000-${time}${offset}`);
      const later = await parsedDate(`0400-${time}${offset}`);
      assert(early instanceof Date && later instanceof Date);
      assert.equal(
        early.getTime(),
        later.getTime() - fourHundredYears,
        time + offset,
      );
    }
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
