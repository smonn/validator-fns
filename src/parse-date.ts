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
    year,
    month = '01',
    day = '01',
    hour = '00',
    minute = '00',
    second = '00',
    fraction = '0',
    timezone,
  ] = parts;
  const milliseconds = Number(fraction) * 1e3;

  if (!timezone) {
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      milliseconds,
    );
  }

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) + parseTimezone(timezone),
      Number(second),
      milliseconds,
    ),
  );
}
