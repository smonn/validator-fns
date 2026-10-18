import { createValidatorTest } from './pipeline/index.js';
import type {
  MessageExtras,
  Test,
  ValidatorMessage,
  ValidatorMessageParameters,
} from './types.js';
import { timeOf } from './valid-date.js';

export interface OneOfValidatorMessageParameters<
  T,
> extends ValidatorMessageParameters<T> {
  values: readonly T[];
}

/**
 * Ensures a value is one in a predefined list.
 * @param values List of allowed values.
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function oneOf<T extends string | number | boolean | Date>(
  values: readonly T[],
  message?: ValidatorMessage<
    T,
    MessageExtras<OneOfValidatorMessageParameters<T>>
  >,
): Test<T, never> {
  return createValidatorTest(
    'oneOf',
    (value: T) => {
      if (values.includes(value)) {
        return true;
      }
      if (typeof value !== 'object') {
        return false;
      }
      // Primitives stay off timeOf, whose throw is slow. NaN equals nothing, so
      // only a valid date matches by its time.
      const time = timeOf(value);
      return values.some((x) => typeof x === 'object' && timeOf(x) === time);
    },
    message,
    () => ({ values }),
  );
}
