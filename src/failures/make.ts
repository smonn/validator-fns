import type { Failure } from '../shared.js';

/**
 * Creates an invalid result synchronously from a formatted message, for
 * `invalid` and the built-in tests' synchronous twins.
 * @internal
 */
export function failure<E = never>({
  errors,
  field,
  message,
}: {
  message: string;
  field: string | undefined;
  errors?: E | undefined;
}): Failure<E> {
  return {
    state: 'invalid',
    message,
    field,
    errors,
  };
}
