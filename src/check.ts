import { failure } from './failures/index.js';
import {
  type AtPath,
  errorAt,
  errorAtKey,
  formatMessage,
  type KeyPath,
  type Test,
  validResult,
  type ValidatorMessage,
} from './shared.js';

/**
 * Makes the test. `toErrors` turns a failure's formatted message into the
 * object's errors; without it, the message is the object's own.
 * @internal
 */
function checkWith<T, E>(
  test: (value: T) => boolean,
  message: ValidatorMessage<T>,
  toErrors?: (formatted: string) => E,
): Test<T, E> {
  return async (value, field) => {
    if (test(value)) {
      return validResult({ value, field });
    }

    const formatted = formatMessage(message, { value, field });
    return toErrors
      ? failure({ message: '', field, errors: toErrors(formatted) })
      : failure({ message: formatted, field });
  };
}

/**
 * An object-level test for `object()`. It fails when `test` returns false for
 * the parsed object. The message goes to the error at `path`, a property name
 * or a list of names into nested objects, or to the object's own message
 * without a path. The message gets the parsed object as `value` and the
 * object's `field`. The path is checked against the object's type, and so are
 * the errors it produces.
 * @category Validation Tests
 */
export function check<T>(
  test: (value: T) => boolean,
  message: ValidatorMessage<T>,
): Test<T, never>;
export function check<T, const K extends keyof T & string>(
  path: K,
  test: (value: T) => boolean,
  message: ValidatorMessage<T>,
): Test<T, { [P in K]?: string }>;
export function check<T, const Path extends KeyPath<T>>(
  path: Path,
  test: (value: T) => boolean,
  message: ValidatorMessage<T>,
): Test<T, AtPath<Path>>;
export function check<
  T,
  K extends keyof T & string,
  // Not KeyPath<T>, which TypeScript can't expand for a generic T here.
  Path extends readonly string[],
>(
  ...args:
    | [test: (value: T) => boolean, message: ValidatorMessage<T>]
    | [
        path: K | Path,
        test: (value: T) => boolean,
        message: ValidatorMessage<T>,
      ]
): Test<T, never> | Test<T, { [P in K]?: string }> | Test<T, AtPath<Path>> {
  if (args.length === 2) {
    return checkWith<T, never>(args[0], args[1]);
  }

  const [path, test, message] = args;
  return typeof path === 'string'
    ? checkWith(test, message, (formatted) => errorAtKey(path, formatted))
    : checkWith(test, message, (formatted) => errorAt(path, formatted));
}
