/** @internal */
const isoDatePattern =
  /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01])(?:[ T]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?(Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?)?)?)?$/;

/**
 * Reads a timezone that `isoDatePattern` matched, `Z` or an offset such as
 * `+02:00` or `-0530`, in minutes. Without one, the offset is 0.
 * @param timezone Timezone to read
 * @internal
 */
function parseTimezone(timezone = 'Z'): number {
  if (timezone === 'Z') {
    return 0;
  }

  const offset = Number(timezone.slice(1, 3)) * 60 + Number(timezone.slice(-2));
  return timezone.startsWith('-') ? -offset : offset;
}

/**
 * Reads a date from a number or an ISO 8601 string. Returns `undefined` for a
 * string that isn't ISO 8601 or has a part out of its range, such as
 * `'2020-02-30'` or hour 24, and for input that isn't a number or string.
 * @param value Value to read
 */
export function readDate(value: unknown): Date | undefined {
  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parts = isoDatePattern.exec(value);
  return parts === null ? undefined : parseIsoDate(parts);
}

/**
 * The components of a date, in the order `Date.UTC()` takes them.
 * @internal
 */
type DateComponents = Readonly<Required<Parameters<typeof Date.UTC>>>;

/**
 * Builds a date from its components, in UTC or in local time.
 * @param components Components of the date, with the year as written
 * @param utc Whether the components are in UTC
 * @internal
 */
function buildDate(components: DateComponents, utc: boolean): Date {
  if (components[0] >= 100) {
    return utc ? new Date(Date.UTC(...components)) : new Date(...components);
  }

  // `new Date()` and `Date.UTC()` read the years 0 to 99 as 1900 to 1999, so
  // those are built 400 years later and moved back. The calendar repeats every
  // 400 years, and both eras predate time zone rules, so the local offset is
  // the same.
  const [year, ...rest] = components;
  const date = buildDate([year + 400, ...rest], utc);
  date.setUTCFullYear(date.getUTCFullYear() - 400);
  return date;
}

/**
 * Reads a date from the parts `isoDatePattern` matched. Without a timezone, the
 * date is local. Returns `undefined` for a day past the end of its month.
 * @param parts Parts the pattern matched
 * @internal
 */
function parseIsoDate(parts: RegExpExecArray): Date | undefined {
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
  // A day past the end of its month, such as 30 February, rolls over. The
  // pattern checks every other part's range, and every month has 28 days. The
  // calendar repeats every 400 years, so the month is read 400 years later,
  // past the years `Date.UTC()` reads as 1900 to 1999.
  if (
    dayOfMonth > 28 &&
    dayOfMonth >
      new Date(Date.UTC(fullYear + 400, monthIndex + 1, 0)).getUTCDate()
  ) {
    return undefined;
  }

  return buildDate(
    [
      fullYear,
      monthIndex,
      dayOfMonth,
      Number(hour),
      Number(minute) + parseTimezone(timezone),
      Number(second),
      Number(fraction) * 1e3,
    ],
    timezone !== undefined,
  );
}
