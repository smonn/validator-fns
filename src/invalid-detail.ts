import type { InvalidResult, ValidatorTest } from './shared.js';

/**
 * Runs tests on a value in order, stopping at the first failure, for the
 * collection-level tests of `array()` and `object()`.
 * @param tests Tests to run
 * @param value Value to test
 * @param field Field name
 * @internal
 */
export async function findInvalidResult<V, E>(
  tests: ValidatorTest<V, E>[],
  value: V,
  field: string | undefined,
): Promise<InvalidResult<E> | undefined> {
  for (const validatorTest of tests) {
    const result = await validatorTest(value, field);
    if (result.state === 'invalid') {
      return result;
    }
  }

  return undefined;
}

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
