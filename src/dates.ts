import { createTypeValidatorTest, createValidatorTest } from './factories.js';
import type {
  ConfigBase,
  ValidatorMessage,
  ValidatorMessageParameters,
  Validator,
} from './shared.js';
import { parseDate } from './parse-date.js';

/**
 * Applies a configuration to the date value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 * @deprecated v3 removes this, with no replacement.
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

/** @deprecated v3 removes this, with no replacement. */
export type SharedDateValueType = Date | string | number;

export interface MinDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
  min: Date | null | undefined;
  /** @deprecated v3 removes this. Use `min` instead. */
  limit: Date | null | undefined;
  /** @deprecated v3 removes this, with the `exclusive` argument. */
  exclusive?: boolean | undefined;
}

/**
 * Ensures a date value is on or after a date.
 * @param limit Minimum date
 * @param message Error message
 * @category Validation Tests
 */
export function minDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MinDateValidatorMessageParameters>,
): Validator<Date, null>;
/**
 * Ensures a date value is on or after a date.
 * @param limit Minimum date
 * @param message Error message
 * @param exclusive Makes comparison exclusive instead of inclusive
 * @category Validation Tests
 * @deprecated v3 removes `exclusive`. In v3, use `check()` instead, such as
 * `check((d) => d > limit, message)`.
 */
export function minDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MinDateValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<Date, null>;
export function minDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MinDateValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<Date, null> {
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
  /** @deprecated v3 removes this. Use `max` instead. */
  limit: Date | null | undefined;
  /** @deprecated v3 removes this, with the `exclusive` argument. */
  exclusive?: boolean | undefined;
}

/**
 * Ensures a date value is on or before a date.
 * @param limit Maximum date
 * @param message Error message
 * @category Validation Tests
 */
export function maxDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MaxDateValidatorMessageParameters>,
): Validator<Date>;
/**
 * Ensures a date value is on or before a date.
 * @param limit Maximum date
 * @param message Error message
 * @param exclusive Makes comparison exclusive instead of inclusive
 * @category Validation Tests
 * @deprecated v3 removes `exclusive`. In v3, use `check()` instead, such as
 * `check((d) => d < limit, message)`.
 */
export function maxDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MaxDateValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<Date>;
export function maxDate(
  limit: SharedDateValueType,
  message: ValidatorMessage<Date, MaxDateValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<Date> {
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
export const date = createTypeValidatorTest<Date, DateConfig>(
  { parser: parseDate },
  applyDateConfig,
);
