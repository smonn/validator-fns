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
 * Whether a value is a `Date`, from any realm. `getTime` throws unless `this`
 * is a `Date`, which `instanceof` can't tell across realms.
 * @internal
 */
function isDate(value: unknown): value is Date {
  try {
    Date.prototype.getTime.call(value);
    return true;
  } catch {
    return false;
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
    (value: T) =>
      values.includes(value) ||
      (isDate(value) && values.some((x) => x.valueOf() === value.valueOf())),
    message,
    () => ({ values }),
  );
}
