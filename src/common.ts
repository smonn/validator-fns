import { createValidatorTest } from './factories.js';
import type {
  ValidatorMessage,
  ValidatorMessageParameters,
  ValidatorTest,
} from './shared.js';

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
): ValidatorTest<T, never> {
  const allowed: readonly unknown[] = values;
  return createValidatorTest(
    (value) =>
      value === undefined ||
      value === null ||
      allowed.includes(value) ||
      (value instanceof Date &&
        values.some((x) => x.valueOf() === value.valueOf())),
    message,
    () => ({ values }),
  );
}
