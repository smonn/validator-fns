import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  date,
  maxDate,
  minDate,
  optional,
  type Failure,
} from '../src/index.js';

const invalidDate = new Date('');

/** The limit `minDate()` reads, from the params of its failure. */
async function parsedDate(limit: Date | string | number) {
  const result = await minDate(limit)(new Date(-8.64e15));
  assert(result.state === 'invalid');
  return result.params['min'];
}

test('minDate() reads dates, timestamps and ISO 8601 strings as its limit', async () => {
  const now = new Date();
  const foreign: Date = runInNewContext('new Date(0)');
  assert.strictEqual(await parsedDate(now), now);
  assert.strictEqual(await parsedDate(foreign), foreign);
  assert.deepEqual(await parsedDate(0), new Date(0));
  assert.deepEqual(await parsedDate('2020'), new Date(2020, 0));
  assert.deepEqual(await parsedDate('2020-13'), new Date(2021, 0));
  assert.deepEqual(await parsedDate('2020-01'), new Date(2020, 0));
  assert.deepEqual(await parsedDate('2020-01-31'), new Date(2020, 0, 31));
  assert.deepEqual(
    await parsedDate('2020-01-31 12:45'),
    new Date(2020, 0, 31, 12, 45),
  );
  assert.deepEqual(
    await parsedDate('2020-01-31T12:45:32'),
    new Date(2020, 0, 31, 12, 45, 32),
  );
  assert.deepEqual(
    await parsedDate('2020-01-31T12:45:32Z'),
    new Date(Date.UTC(2020, 0, 31, 12, 45, 32)),
  );
  assert.deepEqual(
    await parsedDate('2020-01-31T12:45:32+01:30'),
    new Date(Date.UTC(2020, 0, 31, 14, 15, 32)),
  );
  assert.deepEqual(
    await parsedDate('2020-01-31T12:45:32-0200'),
    new Date(Date.UTC(2020, 0, 31, 10, 45, 32)),
  );
  assert.deepEqual(
    await parsedDate('2020-01-31T12:45:32.123'),
    new Date(2020, 0, 31, 12, 45, 32, 123),
  );
  assert.deepEqual(
    await parsedDate('2020-01-31T12:45:32.001242Z'),
    new Date(Date.UTC(2020, 0, 31, 12, 45, 32, 1.242)),
  );
});

test('minDate', async () => {
  const now = new Date();
  const validate = minDate(now, ({ min }) => `min:${min.toISOString()}`);
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    field: undefined,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  assert.deepEqual(await validate(tomorrow), {
    state: 'valid',
    value: tomorrow,
    field: undefined,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  assert.deepEqual(await validate(yesterday), {
    state: 'invalid',
    code: 'minDate',
    params: { min: now },
    message: `min:${now.toISOString()}`,
    field: undefined,
    errors: undefined,
  });
});

test('maxDate', async () => {
  const now = new Date();
  const validate = maxDate(now, ({ max }) => `max:${max.toISOString()}`);
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    field: undefined,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  assert.deepEqual(await validate(tomorrow), {
    state: 'invalid',
    code: 'maxDate',
    params: { max: now },
    message: `max:${now.toISOString()}`,
    field: undefined,
    errors: undefined,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  assert.deepEqual(await validate(yesterday), {
    state: 'valid',
    value: yesterday,
    field: undefined,
  });
});

test('minDate() and maxDate() compare times, which an own valueOf cannot change', async () => {
  const spoof = new Date(0);
  spoof.valueOf = () => 5;
  assert.deepInclude(await minDate(new Date(1))(spoof), { code: 'minDate' });
  assert.deepInclude(await maxDate(new Date(-1))(spoof), { code: 'maxDate' });
  assert.deepInclude(await minDate(spoof)(new Date(1)), { state: 'valid' });
  assert.deepInclude(await maxDate(spoof)(new Date(-1)), { state: 'valid' });

  const throwing = new Date(0);
  throwing.valueOf = () => {
    throw new Error('valueOf');
  };
  assert.deepInclude(await date(minDate(new Date(0)))(throwing), {
    state: 'valid',
  });
  assert.deepInclude(await maxDate(throwing)(new Date(0)), { state: 'valid' });
});

test('date', async () => {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const validate = date(
    { messages: { required: 'required' } },
    minDate(now, 'min'),
    maxDate(nextMonth, 'max'),
  );
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    field: undefined,
  });
  assert.deepEqual(await validate(nextMonth), {
    state: 'valid',
    value: nextMonth,
    field: undefined,
  });
  assert.deepEqual(await validate(tomorrow), {
    state: 'valid',
    value: tomorrow,
    field: undefined,
  });
  assert.deepInclude(await validate(''), { code: 'type' });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    field: undefined,
    errors: undefined,
  });
});

test('date default', async () => {
  const validate = date({ default: new Date(0) });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: new Date(0),
    field: undefined,
  });
  const now = new Date();
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: new Date(0),
    field: undefined,
  });
  assert.deepInclude(await validate(new Date(Number.NaN)), { code: 'type' });
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

test('date() fails anything but a valid date', async () => {
  const notDates: unknown[] = [
    '2020-01-31',
    'tomorrow',
    '',
    '  ',
    0,
    Number.NaN,
    invalidDate,
    true,
    {},
    [2020],
    Symbol('s'),
    1n,
    () => 0,
  ];
  for (const value of notDates) {
    const failure: Failure<string> = {
      state: 'invalid',
      code: 'type',
      params: { expected: 'date' },
      message: 'type',
      field: 'start',
      errors: undefined,
    };
    assert.deepEqual(await date()(value, 'start'), failure);
    assert.deepEqual(await optional(date())(value, 'start'), failure);
  }
});
