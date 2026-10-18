import {
  formatMessage,
  invalidResult,
  type ValidatorMessage,
  type Result,
} from './shared.js';

/** @internal */
type InvalidFields<E> = {
  value: unknown;
  field: string | undefined;
  errors?: E | undefined;
};

/**
 * Creates an invalid result. A message function gets the value as `unknown`,
 * and `extras` must hold the extra parameters it reads.
 * @param result Result fields
 * @param result.message Error message, formatted with `formatMessage`
 * @param result.value Parsed value
 * @param result.field Field name
 * @param result.errors Extra error details, such as per-field errors from `object` and `array`
 * @param result.extras Extra message params
 * @category Helpers
 */
export function invalid<T, E = never>(
  result: InvalidFields<E> & { message: ValidatorMessage<unknown> },
): Promise<Result<T, E>>;
export function invalid<T, E, X extends object>(
  result: InvalidFields<E> & {
    message: ValidatorMessage<unknown, X>;
    extras: X;
  },
): Promise<Result<T, E>>;
export async function invalid<T, E, X extends object>(
  result:
    | (InvalidFields<E> & { message: ValidatorMessage<unknown> })
    | (InvalidFields<E> & { message: ValidatorMessage<unknown, X>; extras: X }),
): Promise<Result<T, E>> {
  const { value, field, errors } = result;
  const message =
    'extras' in result
      ? formatMessage(result.message, { ...result.extras, value, field })
      : formatMessage<unknown>(result.message, { value, field });
  return invalidResult({ message, value, field, errors });
}
