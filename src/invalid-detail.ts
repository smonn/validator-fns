import type { InvalidResult } from './shared.js';

/**
 * The error that `array()` and `object()` record for a failed item or field:
 * its message, or its `errors` when the message is empty. With neither, the
 * empty message, so the failure never reads as `undefined`.
 * @param result Failed result
 * @internal
 */
export function invalidDetail<E>(result: InvalidResult<E>): string | E {
  return result.message || result.errors === undefined
    ? result.message
    : result.errors;
}
