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
