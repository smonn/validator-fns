import { failure } from './failures/index.js';
import type { Result, ValidatorMessage } from './shared.js';

/** @internal */
type InvalidFields<E> = {
  code: string;
  value?: unknown;
  field: string | undefined;
  errors?: E | undefined;
};

/**
 * Creates an invalid result with `code`. A message function gets the value
 * as `unknown`, and `params` must hold the parameters it reads. Without a
 * message, the message is the code.
 * @param result Result fields
 * @param result.code What failed, such as `taken`
 * @param result.params The code's parameters, `{}` if left out
 * @param result.message Error message, a template or a function
 * @param result.value Value for the message only; the result has none
 * @param result.field Field name
 * @param result.errors Extra error details, such as per-field errors from `object` and `array`
 * @category Helpers
 */
export function invalid<T, E = never>(
  result: InvalidFields<E> & { message?: ValidatorMessage<unknown> },
): Promise<Result<T, E>>;
export function invalid<T, E, P extends Record<string, unknown>>(
  result: InvalidFields<E> & {
    params: P;
    message?: ValidatorMessage<unknown, P>;
  },
): Promise<Result<T, E>>;
export async function invalid<T, E, P extends Record<string, unknown>>(
  result:
    | (InvalidFields<E> & { message?: ValidatorMessage<unknown> })
    | (InvalidFields<E> & {
        params: P;
        message?: ValidatorMessage<unknown, P>;
      }),
): Promise<Result<T, E>> {
  const { code, value, field, errors } = result;
  return 'params' in result
    ? failure({
        code,
        params: result.params,
        message: result.message,
        value,
        field,
        errors,
      })
    : failure({
        code,
        params: {},
        message: result.message,
        value,
        field,
        errors,
      });
}
