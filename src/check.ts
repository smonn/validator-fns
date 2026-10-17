import {
  formatMessage,
  invalid,
  valid,
  type ValidatorMessage,
  type ValidatorTest,
} from './shared.js';

/**
 * An object-level test for `object()`. It fails when `test` returns false for
 * the parsed object. The message goes to the error at `path`, a property name
 * or a list of names into nested objects, or to the object's own message
 * without a path. The message gets the parsed object as `value` and the
 * object's `field`.
 * @category Validation Tests
 */
export function check<T, E = never>(
  test: (value: T) => boolean,
  message: ValidatorMessage<T>,
): ValidatorTest<T, E>;
export function check<T, E = never>(
  path: string | readonly string[],
  test: (value: T) => boolean,
  message: ValidatorMessage<T>,
): ValidatorTest<T, E>;
export function check<T, E = never>(
  ...args:
    | [test: (value: T) => boolean, message: ValidatorMessage<T>]
    | [
        path: string | readonly string[],
        test: (value: T) => boolean,
        message: ValidatorMessage<T>,
      ]
): ValidatorTest<T, E> {
  const [path, test, message] = args.length === 2 ? [[], ...args] : args;
  const keys = typeof path === 'string' ? [path] : path;

  return async (value, field) => {
    const parsed = value as T;
    if (test(parsed)) {
      return valid({ value: parsed, field });
    }

    if (keys.length === 0) {
      return invalid({ message, value: parsed, field });
    }

    // Computed keys define own properties, so a `__proto__` key stays one.
    const errors = keys.reduceRight<unknown>(
      (inner, key) => ({ [key]: inner }),
      formatMessage(message, { value: parsed, field }),
    );
    return invalid({ message: '', value: parsed, field, errors: errors as E });
  };
}
