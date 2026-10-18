import type { Failure } from '../shared.js';

/**
 * Whether `value` has the fields every failure has: `state`, `code`,
 * `params` and `message`.
 * @internal
 */
function isFailure(value: unknown): value is Failure<unknown> {
  if (typeof value !== 'object' || value === null) {
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
 * a bug in the code that made it, so it throws (ADR 0001).
 * @param what What `value` is, for the error
 * @internal
 */
export function readFailure(value: unknown, what: string): Failure<unknown> {
  if (isFailure(value)) {
    return value;
  }

  throw new TypeError(`${what} isn't a failure`);
}
