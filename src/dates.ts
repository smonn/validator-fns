import {
  createParser,
  createTypeValidatorTest,
  createValidatorTest,
} from './factories.js';
import type {
  ConfigBase,
  MessageExtras,
  ValidatorMessage,
  Test,
  ValidatorMessageParameters,
} from './shared.js';
import { readDate } from './parse-date.js';

/**
 * Parses a value into a date. Fails a non-blank string that isn't ISO 8601,
 * and input that isn't a date, number, or string.
 * @internal
 */
const parseDate = createParser(readDate, 'Failed to parse value to date.');

/**
 * Parses the limit of `minDate()` or `maxDate()`. Throws a `TypeError` for one
 * it can't read, so bad configuration fails when the test is built.
 * @param limit Limit to parse
 */
function parseLimit(limit: SharedDateValueType): Date | null | undefined {
  const parsed = parseDate(limit);
  if (parsed.state === 'invalid') {
    throw new TypeError(parsed.message);
  }

  return parsed.value;
}

/**
 * Applies a configuration to the parsed date value.
 * @param value Parsed value
 * @param config Configuration to apply
 * @internal
 */
function applyDateConfig(
  value: Date | null | undefined,
  config: DateConfig,
): Date | null | undefined {
  if (
    config.default !== undefined &&
    (value === undefined || value === null || Number.isNaN(value.getTime()))
  ) {
    return config.default;
  }

  return value;
}

/** @internal */
type SharedDateValueType = Date | string | number;

export interface MinDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
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
  message: ValidatorMessage<
    Date,
    MessageExtras<MinDateValidatorMessageParameters>
  >,
): Test<Date, never> {
  const parsedDate = parseLimit(limit);
  return createValidatorTest(
    (value: Date) =>
      parsedDate !== null && parsedDate !== undefined && value >= parsedDate,
    message,
    () => ({
      min: parsedDate,
      limit: parsedDate,
    }),
  );
}

export interface MaxDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
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
  message: ValidatorMessage<
    Date,
    MessageExtras<MaxDateValidatorMessageParameters>
  >,
): Test<Date, never> {
  const parsedDate = parseLimit(limit);
  return createValidatorTest(
    (value: Date) =>
      parsedDate !== null && parsedDate !== undefined && value <= parsedDate,
    message,
    () => ({
      max: parsedDate,
      limit: parsedDate,
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
  { parser: parseDate },
  applyDateConfig,
);
