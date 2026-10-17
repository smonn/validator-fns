import { createValidatorTest } from './factories.js';
import type {
  ValidatorMessage,
  ValidatorMessageParameters,
  Validator,
} from './shared.js';

/**
 * Ensures a value is not undefined, null, empty string, NaN, nor invalid date.
 * @param message Error message
 * @param nullable Allow null values
 * @category Validation Tests
 */
export function required<T, P extends ValidatorMessageParameters<T>>(
  message: ValidatorMessage<T, P>,
  nullable?: boolean,
): Validator<T> {
  return createValidatorTest(
    (value) =>
      (nullable && value === null) ||
      (value !== null &&
        value !== undefined &&
        !(typeof value === 'string' && value === '') &&
        !(typeof value === 'number' && Number.isNaN(value)) &&
        !(value instanceof Date && Number.isNaN(value.valueOf()))),
    message,
  );
}

export interface OneOfValidatorMessageParameters<
  T,
> extends ValidatorMessageParameters<T> {
  values: readonly T[];
}

/**
 * Ensures a value is one in a predefined list.
 * @param values List of allowed values.
 * @param message Error message
 * @category Validation Tests
 */
export function oneOf<T extends string | number | boolean | Date>(
  values: readonly T[],
  message: ValidatorMessage<T, OneOfValidatorMessageParameters<T>>,
): Validator<T> {
  return createValidatorTest(
    (value) =>
      value === undefined ||
      value === null ||
      values.includes(value as T) ||
      (value instanceof Date &&
        values.some((x) => x.valueOf() === value.valueOf())),
    message,
    () => ({ values }),
  );
}
