import { isDate } from './date-check.js';

/**
 * Badly formatted date for internal use.
 * @deprecated v3 removes this, with no replacement.
 */
export const invalidDate = new Date('');

/** @internal */
const isoDatePattern =
  /^(\d{4})(?:-([0-2]\d)(?:-([0-3]\d)(?:[ T]([0-2]\d):([0-5]\d)(?::([0-5]\d)(\.\d+)?)?(Z|[+-][0-2]\d:?[0-5]\d)?)?)?)?$/;

/** @internal */
const timezonePattern = /^([+-])([0-2]\d):?([0-5]\d)$/;

/**
 * Parses a timezone string.
 * @param timezone Timezone to parse
 * @returns Minutes ahead of UTC, so `+02:00` gives 120
 * @internal
 */
function parseTimezone(timezone: string): number {
  const parts = timezonePattern.exec(timezone);

  if (timezone === 'Z' || !parts) {
    return 0;
  }

  // The pattern's groups aren't optional, so a match always has the sign,
  // hour, and minute.
  const [, sign, hour, minute] = parts;
  const multiplier = sign === '-' ? -1 : 1;
  const offset = Number(hour) * 60 + Number(minute);

  return multiplier * offset;
}

const BASE = 10;

const dateParts = [
  // Skip
  () => 0,
  // Year, which the date pattern always captures
  (part?: string) => Number(part),
  // Month
  (part = '1') => Number.parseInt(part, BASE) - 1,
  // Day
  (part = '1') => Number.parseInt(part, BASE),
  // Hour
  (part = '0') => Number.parseInt(part, BASE),
  // Minute
  (part = '0') => Number.parseInt(part, BASE),
  // Second
  (part = '0') => Number.parseInt(part, BASE),
  // Millisecond
  (part = '0') => Number.parseFloat(part) * 1e3,
];

/**
 * Parses a value into a date.
 * @param value Value to parse
 * @category Parsers
 * @deprecated v3 removes this. In v3, use `coerce.date()` for text input.
 */
export function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'string') {
    return parseIsoDate(value);
  }

  return isDate(value) ? value : invalidDate;
}

/**
 * Parses an ISO 8601 string into a date. Without a timezone, the date is local.
 * @param value String to parse
 * @internal
 */
function parseIsoDate(value: string): Date {
  const parts = isoDatePattern.exec(value);

  if (parts === null) {
    return invalidDate;
  }

  const [
    ,
    year = 0,
    month = 0,
    day = 0,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  ] = dateParts.map((parse, index) => parse(parts[index]));

  const timezone = parts[8];

  if (!timezone) {
    return new Date(year, month, day, hour, minute, second, millisecond);
  }

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      hour,
      minute - parseTimezone(timezone),
      second,
      millisecond,
    ),
  );
}
