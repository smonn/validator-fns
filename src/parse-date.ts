/** @internal */
const isoDatePattern =
  /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01])(?:[ T]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?(Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?)?)?)?$/;

/**
 * Reads a timezone that `isoDatePattern` matched, `Z` or an offset such as
 * `+02:00` or `-0530`, in minutes.
 * @param timezone Timezone to read
 * @internal
 */
function parseTimezone(timezone: string): number {
  if (timezone === 'Z') {
    return 0;
  }

  const offset = Number(timezone.slice(1, 3)) * 60 + Number(timezone.slice(-2));
  return timezone.startsWith('-') ? -offset : offset;
}

/**
 * Reads a date from a number or an ISO 8601 string. Returns `undefined` for a
 * string that isn't ISO 8601, and for input that isn't a number or string.
 * @param value Value to read
 */
export function readDate(value: unknown): Date | undefined {
  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return parseIsoDate(value);
}

/**
 * Parses an ISO 8601 string into a date. Without a timezone, the date is local.
 * Returns `undefined` for a string that isn't ISO 8601, or has a part out of
 * its range.
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
    year,
    month = '01',
    day = '01',
    hour = '00',
    minute = '00',
    second = '00',
    fraction = '0',
    timezone,
  ] = parts;
  const fullYear = Number(year);
  const monthIndex = Number(month) - 1;
  const dayOfMonth = Number(day);
  // Set by part, since `new Date()` and `Date.UTC()` read the years 0 to 99
  // as 1900 to 1999.
  const date = new Date(0);
  date.setUTCFullYear(fullYear, monthIndex, dayOfMonth);
  // A day past the end of its month, such as 30 February, rolls over. The
  // pattern checks every other part's range.
  if (date.getUTCDate() !== dayOfMonth) {
    return undefined;
  }

  const milliseconds = Number(fraction) * 1e3;
  if (timezone) {
    const minutes = Number(minute) + parseTimezone(timezone);
    date.setUTCHours(Number(hour), minutes, Number(second), milliseconds);
  } else {
    date.setFullYear(fullYear, monthIndex, dayOfMonth);
    date.setHours(Number(hour), Number(minute), Number(second), milliseconds);
  }
  return date;
}
