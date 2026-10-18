import type { Result } from '../shared.js';
import { type Def, type Exit, isMissing, typeFailure } from './def.js';
import { runPresent, wordOwn } from './present.js';
import { andThen, type MaybePromise } from './promises.js';

/**
 * Whether `isType` accepts `value`. Input such as a revoked Proxy, on which
 * `Array.isArray` throws, isn't of the type.
 * @internal
 */
function isOfType<P>(
  isType: (value: unknown) => value is P,
  value: unknown,
): value is P {
  try {
    return isType(value);
  } catch {
    return false;
  }
}

/**
 * Fills missing input with `default` or `object()`'s build, or exits.
 * @internal
 */
function fillMissing<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  input: null | undefined,
  field: string | undefined,
): MaybePromise<Result<T | V, E>> {
  const filled = def.default ?? def.build;
  return filled === undefined
    ? exit(input, field, def.messages)
    : runPresent(def, exit, filled, field, input);
}

/**
 * Goes on with what the parser read. A parsed `undefined` or `null` counts as
 * missing.
 * @internal
 */
function runParsed<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  parsed: Result<P | null | undefined, E>,
  field: string | undefined,
): MaybePromise<Result<T | V, E>> {
  if (parsed.state === 'invalid') {
    return wordOwn(def.messages, parsed);
  }

  const { value } = parsed;
  return isMissing(value)
    ? fillMissing(def, exit, value, field)
    : runPresent(def, exit, value, field, value);
}

/**
 * Runs a type validator on input, in order: the missing check, then `default`,
 * `object()`'s build or the exit for missing input, or else the parser; then
 * the gate, the children and the tests. It stays synchronous until a step or
 * child returns a promise, and catches nothing, so a throw propagates as it
 * is (ADR 0001).
 * @internal
 */
export function runType<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  input: unknown,
  field: string | undefined,
): MaybePromise<Result<T | V, E>> {
  if (isMissing(input)) {
    return fillMissing(def, exit, input, field);
  }
  if (def.parser === undefined) {
    return isOfType(def.isType, input)
      ? runPresent(def, exit, input, field, input)
      : wordOwn(def.messages, typeFailure(def.expected, input, field));
  }

  return andThen(def.parser(input, field), (done) =>
    runParsed(def, exit, done, field),
  );
}
