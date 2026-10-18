import { failure } from './failures/index.js';
import {
  type AtPath,
  errorAt,
  errorAtKey,
  type KeyPath,
  type Test,
  validResult,
  type ValidatorMessage,
} from './shared.js';

/** @internal */
type CheckArgs<T> = [
  test: (value: T) => boolean,
  code: string,
  message?: ValidatorMessage<T> | undefined,
];

/**
 * The test `check()` returns. `toErrors` turns the failure's message into the
 * object's errors, under a `properties` failure; without it, the failure is
 * the object's own.
 * @internal
 */
function checkWith<T, E>(
  toErrors: ((message: string) => E) | undefined,
  ...[test, code, message]: CheckArgs<T>
): Test<T, E> {
  return async (value, field) => {
    if (test(value)) {
      return validResult({ value, field });
    }

    const own = failure<E, T>({ code, params: {}, message, value, field });
    return toErrors
      ? failure({
          code: 'properties',
          params: {},
          value,
          field,
          errors: toErrors(own.message),
        })
      : own;
  };
}

/**
 * Whether `check()` got no path, since its first argument is the test.
 * @internal
 */
function isWithoutPath<T>(
  args: CheckArgs<T> | [path: unknown, ...CheckArgs<T>],
): args is CheckArgs<T> {
  return typeof args[0] === 'function';
}

/**
 * An object-level test for `object()`. It fails with `code` when `test`
 * returns false for the parsed object. The message, or else the code, goes to
 * the error at `path`, a property name or a list of names into nested objects,
 * under a `properties` failure. Without a path, the failure is the object's
 * own. The message gets the parsed object as `value` and the object's
 * `field`. The path is checked against the object's type, and so are the
 * errors it produces.
 * @category Validation Tests
 */
export function check<T>(...args: CheckArgs<T>): Test<T, never>;
export function check<T, const K extends keyof T & string>(
  path: K,
  ...args: CheckArgs<T>
): Test<T, { [P in K]?: string }>;
export function check<T, const Path extends KeyPath<T>>(
  path: Path,
  ...args: CheckArgs<T>
): Test<T, AtPath<Path>>;
export function check<
  T,
  K extends keyof T & string,
  // Not KeyPath<T>, which TypeScript can't expand for a generic T here.
  Path extends readonly string[],
>(
  ...args: CheckArgs<T> | [path: K | Path, ...CheckArgs<T>]
): Test<T, never> | Test<T, { [P in K]?: string }> | Test<T, AtPath<Path>> {
  if (isWithoutPath(args)) {
    return checkWith<T, never>(undefined, ...args);
  }

  const [path, ...rest] = args;
  return typeof path === 'string'
    ? checkWith((own) => errorAtKey(path, own), ...rest)
    : checkWith((own) => errorAt(path, own), ...rest);
}
