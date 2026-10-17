import {
  invalidResult,
  type ValidatorMessage,
  type ValidatorMessageParameters,
  type ValidatorResult,
} from './shared.js';

/**
 * Creates an invalid result.
 * @param result Result fields
 * @param result.message Error message, formatted with `formatMessage`
 * @param result.value Parsed value
 * @param result.field Field name
 * @param result.errors Extra error details, such as per-field errors from `object` and `array`
 * @param result.extras Extra message params
 * @category Helpers
 */
export async function invalid<
  T,
  E = never,
  P extends ValidatorMessageParameters<T> = ValidatorMessageParameters<T>,
>(result: {
  message: ValidatorMessage<T, P>;
  value: unknown;
  field: string | undefined;
  errors?: E | undefined;
  extras?: Omit<P, 'field' | 'value'> | undefined;
}): Promise<ValidatorResult<T, E>> {
  return invalidResult(result);
}
