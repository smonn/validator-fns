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
 * The time of a `Date` from any realm, or `undefined` for any other value.
 * `getTime` throws unless `this` is a `Date`, which `instanceof` can't tell
 * across realms, and unlike `valueOf` the value can't override it.
 * @internal
 */
function timeOf(value: unknown): number | undefined {
  try {
    return Date.prototype.getTime.call(value);
  } catch {
    return undefined;
  }
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
      const time = timeOf(value);
      return (
        values.includes(value) ||
        (time !== undefined && values.some((x) => timeOf(x) === time))
      );
    },
    message,
    () => ({ values }),
  );
}
