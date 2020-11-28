import { parseDate, invalidDate, minDate, maxDate, date } from './dates';
import { required } from './shared';

test('parseDate', () => {
  const now = new Date();
  expect(parseDate(now)).toBe(now);
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
  const validate = minDate(
    now,
    ({ min }: { min: Date }) => `min:${min.toISOString()}`
  );
  await expect(validate(now)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: now,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  await expect(validate(tomorrow)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: tomorrow,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  await expect(validate(yesterday)).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: yesterday,
    message: `min:${now.toISOString()}`,
  });
});

test('maxDate', async () => {
  const now = new Date();
  const validate = maxDate(
    now,
    ({ max }: { max: Date }) => `max:${max.toISOString()}`
  );
  await expect(validate(now)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: now,
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  await expect(validate(tomorrow)).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: tomorrow,
    message: `max:${now.toISOString()}`,
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  await expect(validate(yesterday)).resolves.toEqual({
    isValid: true,
    field: undefined,
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
  await expect(validate(now)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: now,
  });
  await expect(validate(nextMonth)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: nextMonth,
  });
  await expect(validate(tomorrow)).resolves.toEqual({
    isValid: true,
    field: undefined,
    value: tomorrow,
  });
  await expect(validate('')).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: invalidDate,
    message: 'required',
  });
  await expect(validate(null)).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: null,
    message: 'required',
  });
  await expect(validate(undefined)).resolves.toEqual({
    isValid: false,
    field: undefined,
    value: undefined,
    message: 'required',
  });
});
