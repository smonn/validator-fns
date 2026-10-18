import { failure } from '../failures/index.js';
import type { Test, ValidatorMessage } from '../types.js';
import { validResult } from '../results.js';
import { isMissing } from './def.js';
import { withSyncTwin } from './sync.js';

/**
 * Captures basic validator test pattern. The test gets the parsed value, and
 * fails a missing one, which type validators never pass (#660). A failure has
 * `code`, the params from `getParams`, and `message` or else the code.
 * @param code What failed, such as `min`
 * @param test Test function
 * @param message Error message
 * @param getParams The code's parameters, also given to the message
 */
export function createValidatorTest<T, E = never>(
  code: string,
  test: (value: T, field?: string) => boolean,
  message?: ValidatorMessage<T>,
): Test<T, E>;
export function createValidatorTest<T, E, P extends Record<string, unknown>>(
  code: string,
  test: (value: T, field?: string) => boolean,
  message: ValidatorMessage<T, P> | undefined,
  getParams: (value: T) => P,
): Test<T, E>;
export function createValidatorTest<T, E>(
  code: string,
  test: (value: T, field?: string) => boolean,
  message?: ValidatorMessage<T, Record<string, unknown>>,
  getParams?: (value: T) => Record<string, unknown>,
): Test<T, E> {
  return withSyncTwin((value: T, field) => {
    // JavaScript callers can pass a missing value, which T leaves out.
    if (!isMissing(value) && test(value, field)) {
      return validResult({ value, field });
    }

    const params = getParams ? getParams(value) : {};
    return failure({ code, params, message, value, field });
  });
}
