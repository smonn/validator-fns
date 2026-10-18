import { type Failure, hasOwnProperty, type Messages } from '../shared.js';
import { failure, unworded } from './make.js';

/**
 * Words a validator's own failure from its `messages` config, keyed by code,
 * unless it already has a message. Its children's failures stay as they are.
 * @internal
 */
export function fillOwn<E>(
  made: Failure<E>,
  messages: Messages | undefined,
): Failure<E> {
  // Own keys only, so a code such as `constructor` isn't read from the
  // prototype.
  const message =
    messages !== undefined && hasOwnProperty(messages, made.code)
      ? messages[made.code]
      : undefined;
  if (message === undefined || !unworded.has(made)) {
    return made;
  }

  const { code, params, field, errors } = made;
  const value = unworded.get(made);
  return failure({ code, params, message, value, field, errors });
}

/**
 * A failure the validator returns as its own, such as its parser's, with
 * `errors` in place of its own and worded from `messages`.
 * @internal
 */
export function fillAsOwn<E>(
  made: Failure<unknown>,
  errors: E | undefined,
  messages: Messages | undefined,
): Failure<E> {
  const copy: Failure<E> = { ...made, errors };
  if (unworded.has(made)) {
    unworded.set(copy, unworded.get(made));
  }

  return fillOwn(copy, messages);
}
