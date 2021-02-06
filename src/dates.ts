import {
  ConfigBase,
  createTypeValidatorTest,
  invalid,
  valid,
  ValidatorMessage,
  ValidatorMessageParams,
  ValidatorTest,
} from './shared';

/** @internal */
export const invalidDate = new Date('');

/** @internal */
const isoDatePattern = /^(?:(\d{4})(?:-([012][0-9])(?:-([0123][0-9])(?:[T ]([012][0-9]):([0-5][0-9])(?::([0-5][0-9])(\.\d+)?(Z|[+-][012][0-9]:?[0-5][0-9])?)?)?)?)?)$/;

/** @internal */
const timezonePattern = /^([+-])([012][0-9]):?([0-5][0-9])$/;

/**
 * Parses a timezone string.
 * @param timezone Timezone to parse
 * @internal
 */
function parseTimezone(timezone: string): number {
  if (timezone === 'Z' || !timezonePattern.test(timezone)) {
    return 0;
  }

  const parts = timezone.match(timezonePattern)!;
  const [, sign, hour, minute] = parts;
  const multiplier = sign === '-' ? -1 : 1;
  const offset = parseInt(hour, 10) * 60 + parseInt(minute, 10);

  return multiplier * offset;
}

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

  const parts = value.match(isoDatePattern);

  if (parts === null) {
    return invalidDate;
  }

  const year = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1 || 0;
  const day = parseInt(parts[3], 10) || 1;
  const hour = parseInt(parts[4], 10) || 0;
  const minute = parseInt(parts[5], 10) || 0;
  const second = parseInt(parts[6], 10) || 0;
  const millisecond = (parseFloat(parts[7]) || 0) * 1000;
  const timezone = parts[8];

  if (!timezone) {
    return new Date(year, month, day, hour, minute, second, millisecond);
  }

  const minuteOffset = parseTimezone(timezone);

  return new Date(
    Date.UTC(year, month, day, hour, minute + minuteOffset, second, millisecond)
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
  config: DateConfig
): Date | null | undefined {
  let parsedValue = config.parser(value);
  if (parsedValue === undefined && config.default !== undefined) {
    parsedValue = config.default;
  }
  return parsedValue;
}

export type SharedDateValueType = Date | string | number;

export interface MinDateValidatorMessageParams
  extends ValidatorMessageParams<Date> {
  min: Date | null | undefined;
  limit: Date | null | undefined;
}

/**
 * Ensures a date value is on or after a date.
 * @param limit Minimum date
 * @param message Error message
 * @category Validation Tests
 */
export function minDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MinDateValidatorMessageParams>
): ValidatorTest<Date, null> {
  const parsedDate = parseDate(limit);

  return (value, field) => {
    if (
      parsedDate !== null &&
      parsedDate !== undefined &&
      (value === null || value === undefined || value >= parsedDate)
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null, {
      min: parsedDate,
      limit: parsedDate,
    });
  };
}

export interface MaxDateValidatorMessageParams
  extends ValidatorMessageParams<Date> {
  max: Date | null | undefined;
  limit: Date | null | undefined;
}

/**
 * Ensures a date value is on or before a date.
 * @param limit Maximum date
 * @param message Error message
 * @category Validation Tests
 */
export function maxDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MaxDateValidatorMessageParams>
): ValidatorTest<Date> {
  const parsedDate = parseDate(limit);

  return (value, field) => {
    if (
      parsedDate !== null &&
      parsedDate !== undefined &&
      (value === null || value === undefined || value <= parsedDate)
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null, {
      max: parsedDate,
      limit: parsedDate,
    });
  };
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
  { parser: parseDate },
  applyDateConfig
);
