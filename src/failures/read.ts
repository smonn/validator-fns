import type { Failure } from '../types.js';

/**
 * Whether `value` has the fields every failure has: `state`, `code`,
 * `params` and `message`.
 * @internal
 */
function isFailure(
  value: NonNullable<unknown> | undefined,
): value is Failure<unknown> {
  if (typeof value !== 'object') {
    return false;
  }

  const params: unknown = Reflect.get(value, 'params');
  return (
    Reflect.get(value, 'state') === 'invalid' &&
    typeof Reflect.get(value, 'code') === 'string' &&
    typeof Reflect.get(value, 'message') === 'string' &&
    typeof params === 'object' &&
    params !== null
  );
}

/**
 * `value` as a failure, once it has every failure's fields. Anything else is
 * a bug in the code that made it, so it throws (ADR 0001). `null` never gets
 * here: a tree keeps it for a valid item, and a `null` result fails on its
 * `state` first.
 * @param what What `value` is, for the error
 * @internal
 */
export function readFailure(
  value: NonNullable<unknown> | undefined,
  what: string,
): Failure<unknown> {
  if (isFailure(value)) {
    return value;
  }

  throw new TypeError(`${what} isn't a failure`);
}
