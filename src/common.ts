import { createValidatorTest } from './factories.js';
import type {
  MessageExtras,
  Test,
  ValidatorMessage,
  ValidatorMessageParameters,
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
  message: ValidatorMessage<
    T,
    MessageExtras<OneOfValidatorMessageParameters<T>>
  >,
): Test<T, never> {
  return createValidatorTest(
    (value: T) =>
      values.includes(value) ||
      (value instanceof Date &&
        values.some((x) => x.valueOf() === value.valueOf())),
    message,
    () => ({ values }),
  );
}
