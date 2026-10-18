import { assert, test } from 'vitest';
import {
  date,
  maxDate,
  minDate,
  optional,
  type Failure,
} from '../src/index.js';

const invalidDate = new Date('');

/** The value `date()` parses, with a blank one kept by `optional()`. */
async function parsedDate(value: unknown) {
  const result = await optional(date())(value);
  assert(result.state === 'valid');
  return result.value;
}

test('date() parses dates, timestamps and ISO 8601 strings', async () => {
  const now = new Date();
  assert.deepEqual(await parsedDate(now), now);
  assert.deepEqual(await parsedDate(0), new Date(0));
  assert.deepEqual(await parsedDate(''), invalidDate);
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
  const validate = minDate(now, ({ min }) => `min:${min?.toISOString() ?? ''}`);
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
    message: `min:${now.toISOString()}`,
    field: undefined,
    errors: undefined,
  });
});

test('maxDate', async () => {
  const now = new Date();
  const validate = maxDate(now, ({ max }) => `max:${max?.toISOString() ?? ''}`);
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    field: undefined,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  assert.deepEqual(await validate(tomorrow), {
    state: 'invalid',
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

test('date', async () => {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const validate = date(
    { requiredMessage: 'required' },
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
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
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
  assert.deepEqual(await validate(new Date(Number.NaN)), {
    state: 'valid',
    value: new Date(0),
    field: undefined,
  });
});

test('date() fails input it cannot read apart from a missing one', async () => {
  const unreadable: unknown[] = [
    // Strings that aren't ISO 8601
    'garbage',
    '2020-01-01x',
    'tomorrow',
    '12/31/2020',
    // Input that isn't a date, number, or string
    true,
    false,
    {},
    [2020],
    Symbol('s'),
    1n,
    () => 0,
  ];
  for (const value of unreadable) {
    const parseError: Failure<string> = {
      state: 'invalid',
      message: 'Failed to parse value to date.',
      field: 'start',
      errors: undefined,
    };
    assert.deepEqual(await date()(value, 'start'), parseError);
    assert.deepEqual(await optional(date())(value, 'start'), parseError);
  }

  assert.deepInclude(await date()('  '), { message: 'Required.' });
  assert.deepInclude(await date()(invalidDate), { message: 'Required.' });
  assert.deepInclude(await optional(date())('  '), {
    state: 'valid',
    value: invalidDate,
  });
  assert.strictEqual(await parsedDate(invalidDate), invalidDate);
});
