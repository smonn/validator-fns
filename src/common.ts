import { createValidatorTest, withSyncTwin } from './pipeline/index.js';
import { validResult } from './results.js';
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

/**
 * Makes a test that changes the value and never fails. `fn` is synchronous and
 * keeps the type. A throw from `fn` is a bug, and the validator rejects with
 * it.
 * @param fn Function that returns the new value
 * @category Validation Tests
 */
export function transform<T, R extends NoInfer<T>>(
  // Excludes promises even when T is broad enough to hold one, such as unknown.
  fn: (value: T) => R extends PromiseLike<unknown> ? never : R,
): Test<T, never> {
  return withSyncTwin((value: T, field) =>
    validResult({ value: fn(value), field }),
  );
}
