import { type AtPath, childField, failure, nestAt } from './failures/index.js';
import { type Test, validResult, type ValidatorMessage } from './shared.js';

/**
 * Paths into nested plain objects, as lists of property names, for `check()`.
 * Arrays, dates and functions end a path.
 * @internal
 */
type KeyPath<T> = T extends
  | readonly unknown[]
  | Date
  | ((...args: never[]) => unknown)
  ? never
  : T extends object
    ? {
        [K in keyof T & string]:
          | readonly [K]
          | readonly [K, ...KeyPath<NonNullable<T[K]>>];
      }[keyof T & string]
    : never;

/** @internal */
type CheckArgs<T> = [
  test: (value: T) => boolean,
  code: string,
  message?: ValidatorMessage<T> | undefined,
];

/**
 * The test `check()` returns. Its failure has the full field and sits at the
 * end of `path`, under a `properties` failure for each name; with an empty
 * path, it's the object's own.
 * @internal
 */
function checkWith<T>(
  path: readonly string[],
  ...[test, code, message]: CheckArgs<T>
): Test<T> {
  return async (value, field) => {
    if (test(value)) {
      return validResult({ value, field });
    }

    const fullField = path.reduce(childField, field);
    const own = failure({ code, params: {}, message, value, field: fullField });
    return nestAt(path, own, field, value);
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
 * returns false for the parsed object. With a `path`, a property name or a
 * list of names into nested objects, the failure sits at that path in the
 * object's errors, with the full field, under a `properties` failure for the
 * object and each name. Without a path, the failure is the object's own. The
 * message gets the parsed object as `value`. The path is checked against the
 * object's type, and so are the errors it produces.
 * @category Validation Tests
 */
export function check<T>(...args: CheckArgs<T>): Test<T, never>;
export function check<T, const K extends keyof T & string>(
  path: K,
  ...args: CheckArgs<T>
): Test<T, AtPath<[K]>>;
export function check<T, const Path extends KeyPath<T>>(
  path: Path,
  ...args: CheckArgs<T>
): Test<T, AtPath<Path>>;
export function check<T>(
  ...args: CheckArgs<T> | [path: string | readonly string[], ...CheckArgs<T>]
): Test<T> {
  if (isWithoutPath(args)) {
    return checkWith([], ...args);
  }

  const [path, ...rest] = args;
  return checkWith(typeof path === 'string' ? [path] : path, ...rest);
}
