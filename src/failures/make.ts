import type { Failure, ValidatorMessage } from '../shared.js';
import { wordMessage } from './format.js';

/**
 * Each failure made without a message, with the value it was made for, so a
 * fill can word it later. A copy made with spread isn't in it, so it counts
 * as worded.
 * @internal
 */
export const unworded = new WeakMap<object, unknown>();

/**
 * Makes a failure. Without a message, its message is the code, and it's
 * marked so a fill can word it with the value.
 * @internal
 */
export function failure<
  E = never,
  T = unknown,
  P extends Record<string, unknown> = Record<string, unknown>,
>(spec: {
  code: string;
  params: P;
  message?: ValidatorMessage<T, P> | undefined;
  value?: T | null | undefined;
  field: string | undefined;
  errors?: E | undefined;
}): Failure<E> {
  const { code, params, message, value, field, errors } = spec;
  const made: Failure<E> = {
    state: 'invalid',
    code,
    params,
    message:
      message === undefined ? code : wordMessage(message, params, value, field),
    field,
    errors,
  };
  if (message === undefined) {
    unworded.set(made, value);
  }

  return made;
}
