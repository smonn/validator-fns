import { createTypeValidatorTest, createValidatorTest } from './factories.js';
import type {
  ConfigBase,
  MessageExtras,
  ValidatorMessage,
  Test,
  ValidatorMessageParameters,
} from './shared.js';
import { parseDate } from './parse-date.js';

/**
 * Applies a configuration to the date value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @internal
 */
function applyDateConfig(
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
  const parsedDate = parseDate(limit);
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
  const parsedDate = parseDate(limit);
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
