import { assert, test } from 'vitest';
import {
  date,
  invalidDate,
  maxDate,
  minDate,
  parseDate,
  required,
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
    isValid: true,
    field: undefined,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  assert.deepEqual(await validate(tomorrow), {
    state: 'valid',
    value: tomorrow,
    isValid: true,
    field: undefined,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  assert.deepEqual(await validate(yesterday), {
    state: 'invalid',
    value: yesterday,
    message: `min:${now.toISOString()}`,
    isValid: false,
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
    isValid: true,
    field: undefined,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  assert.deepEqual(await validate(tomorrow), {
    state: 'invalid',
    value: tomorrow,
    message: `max:${now.toISOString()}`,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  assert.deepEqual(await validate(yesterday), {
    state: 'valid',
    value: yesterday,
    isValid: true,
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
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  const max = maxDate(now, 'must be before now', true);
  assert.deepEqual(await max(now), {
    state: 'invalid',
    value: now,
    message: 'must be before now',
    isValid: false,
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
    required('required'),
    minDate(now, 'min'),
    maxDate(nextMonth, 'max'),
  );
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(nextMonth), {
    state: 'valid',
    value: nextMonth,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(tomorrow), {
    state: 'valid',
    value: tomorrow,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    value: invalidDate,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    value: null,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    value: undefined,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
});

test('date default', async () => {
  const validate = date({ default: new Date(0) });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: new Date(0),
    isValid: true,
    field: undefined,
  });
  const now = new Date();
  assert.deepEqual(await validate(now), {
    state: 'valid',
    value: now,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: new Date(0),
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(new Date(Number.NaN)), {
    state: 'valid',
    value: new Date(0),
    isValid: true,
    field: undefined,
  });
});
