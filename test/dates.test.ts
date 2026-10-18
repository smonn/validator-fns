import { runInNewContext } from 'node:vm';
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
    new Date(Date.UTC(2020, 0, 31, 11, 15, 32)),
  );
  assert.deepEqual(
    parseDate('2020-01-31T12:45:32-0200'),
    new Date(Date.UTC(2020, 0, 31, 14, 45, 32)),
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

// Each instant is what `new Date(text)` reads.
const offsetTexts: [text: string, instant: string][] = [
  ['2026-10-17T08:30:00+02:00', '2026-10-17T06:30:00.000Z'],
  ['2026-10-17T08:30:00+0200', '2026-10-17T06:30:00.000Z'],
  ['2026-10-17T08:30:00-05:30', '2026-10-17T14:00:00.000Z'],
  ['2026-10-17T08:30:00-0530', '2026-10-17T14:00:00.000Z'],
  ['2020-01-31T12:45:32+00:00', '2020-01-31T12:45:32.000Z'],
  ['2020-01-31T12:45:32.5+01:00', '2020-01-31T11:45:32.500Z'],
  ['2020-01-31T23:30:00-01:00', '2020-02-01T00:30:00.000Z'],
  ['2020-03-01T00:15:00+0100', '2020-02-29T23:15:00.000Z'],
];

test.each(offsetTexts)(
  'should read %s as %s when the text has a UTC offset',
  (text, instant) => {
    assert.equal(parseDate(text)?.toISOString(), instant);
  },
);

// Each instant is what `new Date(text)` reads.
const minuteZoneTexts: [text: string, instant: string][] = [
  ['2026-10-17T08:30Z', '2026-10-17T08:30:00.000Z'],
  ['2026-10-17 08:30Z', '2026-10-17T08:30:00.000Z'],
  ['2026-10-17T08:30+02:00', '2026-10-17T06:30:00.000Z'],
  ['2026-10-17T08:30+0200', '2026-10-17T06:30:00.000Z'],
  ['2026-10-17T08:30-05:30', '2026-10-17T14:00:00.000Z'],
  ['2026-10-17T08:30-0530', '2026-10-17T14:00:00.000Z'],
  ['2020-01-31T23:30-01:00', '2020-02-01T00:30:00.000Z'],
];

test.each(minuteZoneTexts)(
  'should read %s as %s when a timezone follows the minutes',
  (text, instant) => {
    assert.equal(parseDate(text)?.toISOString(), instant);
  },
);

// `new Date(text)` rejects each of these too.
const malformedZoneTexts = [
  '2026-10-17T08Z',
  '2026-10-17T08+02:00',
  '2026-10-17T08:30+02',
  '2026-10-17T08:30:Z',
  '2026-10-17T08:30.5Z',
  '2026-10-17T08:30Zx',
  'x2026-10-17T08:30Z',
];

test.each(malformedZoneTexts)(
  'should give an invalid date when %s has a malformed timezone',
  (text) => {
    assert.isNaN(parseDate(text)?.getTime());
  },
);

test('should return the date when parseDate gets a date from another realm', () => {
  const foreign: Date = runInNewContext('new Date(0)');
  assert.strictEqual(parseDate(foreign), foreign);
});

test('should return the date when parseDate gets a date from another realm with another toStringTag', () => {
  const foreign: Date = runInNewContext(
    'Object.defineProperty(new Date(0), Symbol.toStringTag, { value: "Other" })',
  );
  assert.strictEqual(parseDate(foreign), foreign);
});

test('should give an invalid date when parseDate gets an object that only looks like a date', () => {
  const throwingTag = {
    get [Symbol.toStringTag]() {
      throw new Error('tag');
    },
  };
  const { proxy: revoked, revoke } = Proxy.revocable({}, {});
  revoke();
  for (const value of [
    Object.create(Date.prototype),
    { [Symbol.toStringTag]: 'Date' },
    throwingTag,
    revoked,
    new Proxy(new Date(0), {}),
  ]) {
    assert.strictEqual(parseDate(value), invalidDate);
  }
});

test('should pass the date through when date() gets a date from another realm', async () => {
  const foreign: Date = runInNewContext('new Date(0)');
  assert.strictEqual((await date()(foreign)).value, foreign);
});

test('should use the default when date() gets an invalid date with its own getTime', async () => {
  const invalid = new Date(Number.NaN);
  Object.defineProperty(invalid, 'getTime', { value: () => 0 });
  const fallback = new Date(1);
  assert.strictEqual(
    (await date({ default: fallback })(invalid)).value,
    fallback,
  );
});

test('should compare against the limit when minDate gets a date from another realm', async () => {
  const validate = minDate(runInNewContext('new Date(1000)'), 'min');
  assert.equal((await validate(new Date(1000))).state, 'valid');
  assert.equal((await validate(new Date(999))).state, 'invalid');
});

test('should compare against the limit when maxDate gets a date from another realm', async () => {
  const validate = maxDate(runInNewContext('new Date(1000)'), 'max');
  assert.equal((await validate(new Date(1000))).state, 'valid');
  assert.equal((await validate(new Date(1001))).state, 'invalid');
});

test('should compare the value when minDate and maxDate get a value from another realm', async () => {
  const validate = date(
    minDate(new Date(1000), 'min'),
    maxDate(new Date(2000), 'max', true),
  );
  assert.equal(
    (await validate(runInNewContext('new Date(1500)'))).state,
    'valid',
  );
  assert.equal(
    (await validate(runInNewContext('new Date(999)'))).state,
    'invalid',
  );
  assert.equal(
    (await validate(runInNewContext('new Date(2000)'))).state,
    'invalid',
  );
});

test('should compare the time when minDate and maxDate get a date with its own valueOf', async () => {
  const early = new Date(500);
  Object.defineProperty(early, 'valueOf', { value: () => 5000 });
  const late = new Date(5000);
  Object.defineProperty(late, 'valueOf', { value: () => 500 });
  assert.equal((await minDate(new Date(1000), 'min')(early)).state, 'invalid');
  assert.equal((await maxDate(new Date(1000), 'max')(late)).state, 'invalid');
});

test('should fail when minDate gets a value that is not a date', async () => {
  const validate = minDate(new Date(0), 'min');
  assert.equal((await validate({})).state, 'invalid');
  assert.equal((await validate('2020-01-01')).state, 'invalid');
});

test('should keep the parsed value when a custom parser returns a non-date with getTime', async () => {
  const parsed: Date = Object.create(Date.prototype);
  Object.defineProperty(parsed, 'getTime', { value: () => 1000 });
  const validate = date({ parser: () => parsed, default: new Date(0) });
  const result = await validate(1);
  assert.equal(result.state, 'valid');
  assert.strictEqual(result.value, parsed);
});

test('should stay valid when date() gets text it cannot read', async () => {
  assert.equal((await date()('garbage')).state, 'valid');
});

test('should fail when minDate gets a value that only looks like a date', async () => {
  const validate = minDate(new Date(0), 'min');
  const { proxy: revoked, revoke } = Proxy.revocable({}, {});
  revoke();
  for (const value of [
    Object.create(Date.prototype),
    new Proxy(new Date(5), {}),
    revoked,
  ]) {
    assert.equal((await validate(value)).state, 'invalid');
  }
  const relabeled: Date = runInNewContext(
    'Object.defineProperty(new Date(5), Symbol.toStringTag, { value: "Other" })',
  );
  assert.equal((await validate(relabeled)).state, 'valid');
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

test('should compare against the offset instant when minDate gets offset text', async () => {
  const validate = minDate('2026-10-17T08:30:00+02:00', 'min');
  const instant = Date.UTC(2026, 9, 17, 6, 30);
  assert.equal((await validate(new Date(instant))).state, 'valid');
  assert.equal((await validate(new Date(instant - 1))).state, 'invalid');
});

test('should compare against the offset instant when maxDate gets offset text', async () => {
  const validate = maxDate('2026-10-17T08:30:00-0530', 'max');
  const instant = Date.UTC(2026, 9, 17, 14, 0);
  assert.equal((await validate(new Date(instant))).state, 'valid');
  assert.equal((await validate(new Date(instant + 1))).state, 'invalid');
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
