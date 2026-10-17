import { assert, test } from 'vitest';
import {
  date,
  invalidDate,
  maxDate,
  minDate,
  optional,
  parseDate,
  type InvalidResult,
} from '../src/index.js';

test('parseDate', () => {
  const now = new Date();
  assert.deepEqual(parseDate(now), now);
  assert.deepEqual(parseDate(0), new Date(0));
  assert.deepEqual(parseDate({}), invalidDate);
  assert.deepEqual(parseDate(''), invalidDate);
  assert.deepEqual(parseDate('2020'), new Date(2020, 0));
  assert.deepEqual(parseDate('2020-13'), new Date(2021, 0));
  assert.deepEqual(parseDate('2020-01'), new Date(2020, 0));
  assert.deepEqual(parseDate('2020-01-31'), new Date(2020, 0, 31));
  assert.deepEqual(
    parseDate('2020-01-31 12:45'),
    new Date(2020, 0, 31, 12, 45),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32'),
    new Date(2020, 0, 31, 12, 45, 32),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32Z'),
    new Date(Date.UTC(2020, 0, 31, 12, 45, 32)),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32+01:30'),
    new Date(Date.UTC(2020, 0, 31, 14, 15, 32)),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32-0200'),
    new Date(Date.UTC(2020, 0, 31, 10, 45, 32)),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32.123'),
    new Date(2020, 0, 31, 12, 45, 32, 123),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32.001242Z'),
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
    value: yesterday,
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
    value: tomorrow,
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

test('exclusive', async () => {
  const now = new Date();
  const min = minDate(now, 'must be after now', true);
  assert.deepEqual(await min(now), {
    state: 'invalid',
    value: now,
    message: 'must be after now',
    field: undefined,
    errors: undefined,
  });
  const max = maxDate(now, 'must be before now', true);
  assert.deepEqual(await max(now), {
    state: 'invalid',
    value: now,
    message: 'must be before now',
    field: undefined,
    errors: undefined,
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
    value: invalidDate,
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    value: null,
    message: 'required',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    value: undefined,
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

test('parseDate throws for a non-blank string it cannot read', () => {
  for (const value of ['garbage', '2020-01-01x', 'tomorrow', '12/31/2020']) {
    assert.throws(
      () => parseDate(value),
      TypeError,
      'Failed to parse value to date.',
      value,
    );
  }
  assert.deepEqual(parseDate(''), invalidDate);
  assert.deepEqual(parseDate('  '), invalidDate);
  assert.strictEqual(parseDate(invalidDate), invalidDate);
});

test('date() fails an unreadable string apart from a missing one', async () => {
  const parseError: InvalidResult<string> = {
    state: 'invalid',
    message: 'Failed to parse value to date.',
    value: 'garbage',
    field: 'start',
    errors: undefined,
  };
  assert.deepEqual(await date()('garbage', 'start'), parseError);
  assert.deepEqual(await optional(date())('garbage', 'start'), parseError);

  assert.deepInclude(await date()('  '), { message: 'Required.' });
  assert.deepInclude(await date()(invalidDate), { message: 'Required.' });
  assert.deepInclude(await optional(date())('  '), {
    state: 'valid',
    value: invalidDate,
  });
});
