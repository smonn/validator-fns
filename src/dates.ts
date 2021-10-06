import {
  ConfigBase,
  createTypeValidatorTest,
  createValidatorTest,
  ValidatorMessage,
  ValidatorMessageParameters,
  ValidatorTest,
} from './shared';

/** Badly formatted date for internal use. */
export const invalidDate = new Date('');

/** @internal */
const isoDatePattern
	= /^(\d{4})(?:-([012]\d)(?:-([0123]\d)(?:[T ]([012]\d):([0-5]\d)(?::([0-5]\d)(\.\d+)?(Z|[+-][012]\d:?[0-5]\d)?)?)?)?)?$/;

/** @internal */
const timezonePattern = /^([+-])([012]\d):?([0-5]\d)$/;

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

  const [, sign, hour, minute] = parts;
  const multiplier = sign === '-' ? -1 : 1;
  const hoursInMinutes = Number.parseInt(hour ?? '0', 10) * 60;
  const offset = hoursInMinutes + Number.parseInt(minute ?? '0', 10);

  return multiplier * offset;
}

const BASE = 10;

const dateParts = [
  // Skip
  () => 0,
  // Year
  (part = '0') => Number.parseInt(part, BASE),
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
 */
export function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value !== 'string') {
    return invalidDate;
  }

  const parts = isoDatePattern.exec(value);

  if (parts === null) {
    return invalidDate;
  }

  const [, year, month, day, hour, minute, second, millisecond] = dateParts.map(
    (parse, i) => parse(parts[i]),
  );

  const timezone = parts[8];

  if (!timezone) {
    return new Date(year, month, day, hour, minute, second, millisecond);
  }

  const minuteOffset = parseTimezone(timezone);

  return new Date(
    Date.UTC(year, month, day, hour, minute + minuteOffset, second, millisecond),
  );
}

/**
 * Applies a configuration to the date value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyDateConfig(
  value: unknown,
  config: DateConfig,
): Date | null | undefined {
  let parsedValue = config.parser(value);
  if (parsedValue === undefined && config.default !== undefined) {
    parsedValue = config.default;
  }

  return parsedValue;
}

export type SharedDateValueType = Date | string | number;

export interface MinDateValidatorMessageParameters
  extends ValidatorMessageParameters<Date> {
  min: Date | null | undefined;
  limit: Date | null | undefined;
  exclusive?: boolean;
}

/**
 * Ensures a date value is on or after a date.
 * @param limit Minimum date
 * @param message Error message
 * @param exclusive Makes comparison exclusive instead of inclusive
 * @category Validation Tests
 */
export function minDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MinDateValidatorMessageParameters>,
  exclusive?: boolean,
): ValidatorTest<Date, null> {
  const parsedDate = parseDate(limit);
  return createValidatorTest(
    value =>
      parsedDate !== null
			&& parsedDate !== undefined
			&& (value === null
				|| value === undefined
				|| (value instanceof Date
					&& (exclusive ? value > parsedDate : value >= parsedDate))),
    message,
    () => ({
      min: parsedDate,
      limit: parsedDate,
      exclusive,
    }),
  );
}

export interface MaxDateValidatorMessageParameters
  extends ValidatorMessageParameters<Date> {
  max: Date | null | undefined;
  limit: Date | null | undefined;
  exclusive?: boolean;
}

/**
 * Ensures a date value is on or before a date.
 * @param limit Maximum date
 * @param message Error message
 * @param exclusive Makes comparison exclusive instead of inclusive
 * @category Validation Tests
 */
export function maxDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MaxDateValidatorMessageParameters>,
  exclusive?: boolean,
): ValidatorTest<Date> {
  const parsedDate = parseDate(limit);
  return createValidatorTest(
    value =>
      parsedDate !== null
			&& parsedDate !== undefined
			&& (value === null
				|| value === undefined
				|| (value instanceof Date
					&& (exclusive ? value < parsedDate : value <= parsedDate))),
    message,
    () => ({
      max: parsedDate,
      limit: parsedDate,
      exclusive,
    }),
  );
}

/**
 * Configuration for date validation.
 * @category Types
 */
export type DateConfig = ConfigBase<Date>;

/**
 * Validates a date value.
 * @category Type Validators
 */
export const date = createTypeValidatorTest(
  {parser: parseDate},
  applyDateConfig,
);
