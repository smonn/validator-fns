import {
  type Failure,
  hasOwnProperty,
  type Messages,
  type ValidatorMessage,
} from '../shared.js';
import { failure, unworded } from './make.js';

/**
 * `made` with `errors`, worded with `message` when it was made without one.
 * A copy that is still unworded stays marked, so an outer translation can
 * word it.
 * @internal
 */
function reword<E>(
  made: Failure<E>,
  message: ValidatorMessage<unknown, Record<string, unknown>> | undefined,
  errors: E | undefined,
): Failure<E> {
  if (message !== undefined && unworded.has(made)) {
    const { code, params, field } = made;
    const value = unworded.get(made);
    return failure({ code, params, message, value, field, errors });
  }
  if (errors === made.errors) {
    return made;
  }

  const copy = { ...made, errors };
  if (unworded.has(made)) {
    unworded.set(copy, unworded.get(made));
  }
  return copy;
}

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
  return reword(made, message, made.errors);
}
