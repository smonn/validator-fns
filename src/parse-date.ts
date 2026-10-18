/**
 * The invalid date a blank string parses to.
 * @internal
 */
const invalidDate = new Date('');

/** @internal */
const isoDatePattern =
  /^(\d{4})(?:-([0-2]\d)(?:-([0-3]\d)(?:[ T]([0-2]\d):([0-5]\d)(?::([0-5]\d)(\.\d+)?(Z|[+-][0-2]\d:?[0-5]\d)?)?)?)?)?$/;

/** @internal */
const timezonePattern = /^([+-])([0-2]\d):?([0-5]\d)$/;

/**
 * Parses a timezone string.
 * @param timezone Timezone to parse
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
 * Reads a date from a date, a number or an ISO 8601 string. Returns
 * `undefined` for a non-blank string that isn't ISO 8601, and for input that
 * isn't a date, number, or string.
 * @param value Value to read
 */
export function readDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  // A blank string reads as an invalid date, which as a limit fails every
  // date.
  return value.trim() === '' ? invalidDate : parseIsoDate(value);
}

/**
 * Parses an ISO 8601 string into a date. Without a timezone, the date is local.
 * Returns `undefined` for a string that isn't ISO 8601.
 * @param value String to parse
 * @internal
 */
function parseIsoDate(value: string): Date | undefined {
  const parts = isoDatePattern.exec(value);

  if (parts === null) {
    return undefined;
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
      minute + parseTimezone(timezone),
      second,
      millisecond,
    ),
  );
}
