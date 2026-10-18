import { fillTree, type Translation } from '../failures/index.js';
import type { Messages, Validator } from '../shared.js';
import { optional } from './optional.js';
import { andThen } from './promises.js';
import type { TypeValidator } from './standard.js';
import { fromRun, runOf } from './twins.js';

/**
 * Reads a translation's own enumerable messages once. A translation that isn't an
 * object, or a message that is neither a string nor a function, throws a
 * `TypeError`.
 * @internal
 */
function translationOf(messages: Messages): Translation {
  if (typeof messages !== 'object' || messages === null) {
    throw new TypeError('`messages` must be an object of messages');
  }

  const translation = new Map<string, Messages[string]>();
  for (const code of Object.keys(messages)) {
    const message = messages[code];
    if (typeof message !== 'string' && typeof message !== 'function') {
      throw new TypeError(`\`messages.${code}\` must be a message`);
    }
    translation.set(code, message);
  }

  return translation;
}

/**
 * Wraps `validator` so its results are filled from `translation`, and its
 * `optional()` rebuild is the translated `optional(validator)`.
 * @internal
 */
function translate<T, E>(
  validator: Validator<T, E>,
  translation: Translation,
): TypeValidator<T, E> {
  const run = runOf(validator);
  return fromRun(
    (value, field) =>
      andThen(run(value, field), (done) => fillTree(done, translation)),
    () => translate(optional(validator), translation),
  );
}

/**
 * Binds a translation to a whole validator tree. After each run, every
 * failure in the result's errors tree made without a message is worded from
 * `messages` by its code, so a message passed to a test or set in a
 * `messages` config, or an inner `withMessages()`, wins. The result and
 * `~standard` carry the messages, and `optional()` works around it in either
 * order. `messages`' own enumerable keys are read once, here. A validator
 * that isn't a function, a `messages` that isn't an object, or a message
 * that is neither a string nor a function throws a `TypeError`.
 * @param validator Any validator
 * @param messages Messages keyed by code, such as `en` from `validator-fns/en`
 * @category Helpers
 */
export function withMessages<T, E>(
  validator: Validator<T, E>,
  messages: Messages,
): TypeValidator<T, E> {
  if (typeof validator !== 'function') {
    throw new TypeError('`validator` must be a validator');
  }

  return translate(validator, translationOf(messages));
}
