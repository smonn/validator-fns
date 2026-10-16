import {
  createTypeValidatorTest,
  createValidatorTest,
  type ConfigBase,
  type ValidatorMessage,
  type ValidatorMessageParameters,
  type ValidatorTest,
} from './shared.js';
import { parseDate } from './parse-date.js';

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
  if (
    config.default !== undefined &&
    (parsedValue === undefined ||
      parsedValue === null ||
      Number.isNaN(parsedValue.getTime()))
  ) {
    parsedValue = config.default;
  }

  return parsedValue;
}

export type SharedDateValueType = Date | string | number;

export interface MinDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
  min: Date | null | undefined;
  limit: Date | null | undefined;
  exclusive?: boolean | undefined;
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
    (value) =>
      parsedDate !== null &&
      parsedDate !== undefined &&
      (value === null ||
        value === undefined ||
        (value instanceof Date &&
          (exclusive ? value > parsedDate : value >= parsedDate))),
    message,
    () => ({
      min: parsedDate,
      limit: parsedDate,
      exclusive,
    }),
  );
}

export interface MaxDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
  max: Date | null | undefined;
  limit: Date | null | undefined;
  exclusive?: boolean | undefined;
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
    (value) =>
      parsedDate !== null &&
      parsedDate !== undefined &&
      (value === null ||
        value === undefined ||
        (value instanceof Date &&
          (exclusive ? value < parsedDate : value <= parsedDate))),
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
  { parser: parseDate },
  applyDateConfig,
);
