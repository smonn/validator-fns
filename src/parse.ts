import { FailureError } from './failures/index.js';
import type { Validator } from './shared.js';

/**
 * Resolves to the parsed value, or rejects with a `FailureError` carrying the
 * failure when the input is invalid. A throw from the validator is a bug, so
 * it rejects with the thrown value as it is.
 * @param validator Any validator
 * @param value The input
 * @param field The field name, the root of every field in the failure
 * @category Helpers
 */
export async function parse<T, E>(
  validator: Validator<T, E>,
  value: unknown,
  field?: string,
): Promise<T> {
  const result = await validator(value, field);
  if (result.state === 'valid') {
    return result.value;
  }

  throw new FailureError(result);
}
