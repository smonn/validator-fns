import { createValidatorTest, defineScalar } from './pipeline/index.js';
import type {
  ConfigBase,
  MessageExtras,
  ValidatorMessage,
  Test,
  ValidatorMessageParameters,
} from './shared.js';
import { readDate } from './parse-date.js';

/**
 * The time of a date from any realm, or `NaN` for any other value. `getTime`
 * throws unless `this` is a `Date`, which `instanceof` can't tell across
 * realms, and unlike `valueOf` the value can't override it.
 */
function timeOf(value: unknown): number {
  try {
    return Date.prototype.getTime.call(value);
  } catch {
    return Number.NaN;
  }
}

/** Whether a value is a valid date, from any realm. */
function isValidDate(value: unknown): value is Date {
  return !Number.isNaN(timeOf(value));
}

/**
 * Parses the limit of `minDate()` or `maxDate()`. Throws a `TypeError` for one
 * it can't read, so bad configuration fails when the test is built.
 * @param limit Limit to parse
 */
function parseLimit(limit: SharedDateValueType): Date {
  const parsed = typeof limit === 'object' ? limit : readDate(limit);
  if (!isValidDate(parsed)) {
    throw new TypeError('`limit` must be a valid date');
  }

  return parsed;
}

/** @internal */
type SharedDateValueType = Date | string | number;

export interface MinDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
  min: Date;
}

/**
 * Ensures a date value is on or after a date.
 * @param limit Minimum date
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function minDate(
  limit: SharedDateValueType,
  message?: ValidatorMessage<
    Date,
    MessageExtras<MinDateValidatorMessageParameters>
  >,
): Test<Date, never> {
  const parsedDate = parseLimit(limit);
  return createValidatorTest(
    'minDate',
    (value: Date) => timeOf(value) >= timeOf(parsedDate),
    message,
    () => ({ min: parsedDate }),
  );
}

export interface MaxDateValidatorMessageParameters extends ValidatorMessageParameters<Date> {
  max: Date;
}

/**
 * Ensures a date value is on or before a date.
 * @param limit Maximum date
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function maxDate(
  limit: SharedDateValueType,
  message?: ValidatorMessage<
    Date,
    MessageExtras<MaxDateValidatorMessageParameters>
  >,
): Test<Date, never> {
  const parsedDate = parseLimit(limit);
  return createValidatorTest(
    'maxDate',
    (value: Date) => timeOf(value) <= timeOf(parsedDate),
    message,
    () => ({ max: parsedDate }),
  );
}

/**
 * Configuration for date validation.
 * @category Types
 */
export type DateConfig = ConfigBase<Date>;

/**
 * Validates a date value. Fails anything but a valid date.
 * @category Type Validators
 */
export const date = defineScalar('date', isValidDate);
