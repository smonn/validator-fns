import { parseDate, invalidDate, minDate, maxDate, date } from '../src/dates';
import { required } from '../src/shared';

test('parseDate', () => {
  const now = new Date();
  expect(parseDate(now)).toBe(now);
  expect(parseDate(0)).toEqual(new Date(0));
  expect(parseDate({})).toEqual(invalidDate);
  expect(parseDate('')).toEqual(invalidDate);
  expect(parseDate('2020')).toEqual(new Date(2020, 0));
  expect(parseDate('2020-13')).toEqual(new Date(2021, 0));
  expect(parseDate('2020-01')).toEqual(new Date(2020, 0));
  expect(parseDate('2020-01-31')).toEqual(new Date(2020, 0, 31));
  expect(parseDate('2020-01-31 12:45')).toEqual(new Date(2020, 0, 31, 12, 45));
  expect(parseDate('2020-01-31T12:45:32')).toEqual(
    new Date(2020, 0, 31, 12, 45, 32)
  );
  expect(parseDate('2020-01-31T12:45:32Z')).toEqual(
    new Date(Date.UTC(2020, 0, 31, 12, 45, 32))
  );
  expect(parseDate('2020-01-31T12:45:32+01:30')).toEqual(
    new Date(Date.UTC(2020, 0, 31, 14, 15, 32))
  );
  expect(parseDate('2020-01-31T12:45:32-0200')).toEqual(
    new Date(Date.UTC(2020, 0, 31, 10, 45, 32))
  );
  expect(parseDate('2020-01-31T12:45:32.123')).toEqual(
    new Date(2020, 0, 31, 12, 45, 32, 123)
  );
  expect(parseDate('2020-01-31T12:45:32.001242Z')).toEqual(
    new Date(Date.UTC(2020, 0, 31, 12, 45, 32, 1.242))
  );
});

test('minDate', async () => {
  const now = new Date();
  const validate = minDate(now, ({ min }) => `min:${min?.toISOString()}`);
  await expect(validate(now)).resolves.toMatchObject({
    state: 'valid',
    value: now,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  await expect(validate(tomorrow)).resolves.toMatchObject({
    state: 'valid',
    value: tomorrow,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  await expect(validate(yesterday)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: yesterday,
    message: `min:${now.toISOString()}`,
  });
});

test('maxDate', async () => {
  const now = new Date();
  const validate = maxDate(now, ({ max }) => `max:${max?.toISOString()}`);
  await expect(validate(now)).resolves.toMatchObject({
    state: 'valid',
    value: now,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  await expect(validate(tomorrow)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: tomorrow,
    message: `max:${now.toISOString()}`,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  await expect(validate(yesterday)).resolves.toMatchObject({
    state: 'valid',
    value: yesterday,
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
    maxDate(nextMonth, 'max')
  );
  await expect(validate(now)).resolves.toMatchObject({
    state: 'valid',
    value: now,
  });
  await expect(validate(nextMonth)).resolves.toMatchObject({
    state: 'valid',
    value: nextMonth,
  });
  await expect(validate(tomorrow)).resolves.toMatchObject({
    state: 'valid',
    value: tomorrow,
  });
  await expect(validate('')).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: invalidDate,
    message: 'required',
  });
  await expect(validate(null)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: null,
    message: 'required',
  });
  await expect(validate(undefined)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: undefined,
    message: 'required',
  });
});
