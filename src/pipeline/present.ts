import { fillOwn } from '../failures/index.js';
import type { Messages, Result } from '../shared.js';
import { type Def, type Exit, isMissing } from './def.js';
import { andThen, type MaybePromise, runSteps } from './steps.js';

/**
 * A type validator's own result, a failure worded by its `messages`.
 * @internal
 */
export function wordOwn<T, E>(
  messages: Messages | undefined,
  result: Result<T, E>,
): Result<T, E> {
  return result.state === 'invalid' ? fillOwn(result, messages) : result;
}

/**
 * Runs the tests once every child is valid. When `object()` builds a value
 * for missing input and a child fails, the input is missing after all.
 * @internal
 */
function runTests<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  children: Result<T, E>,
  field: string | undefined,
  input: unknown,
): MaybePromise<Result<T | V, E>> {
  if (children.state === 'invalid') {
    return isMissing(input) && def.build !== undefined
      ? exit(input, field, def.messages)
      : wordOwn(def.messages, children);
  }
  if (def.steps.length === 0) {
    return children;
  }

  const result = runSteps(def.steps, children.value, field);
  // Without messages, wordOwn() leaves a result as it is.
  return def.messages === undefined
    ? result
    : andThen(result, (done) => wordOwn(def.messages, done));
}

/**
 * Runs the gate, the children and the tests on a read value, or on the value
 * that fills missing input.
 * @internal
 */
export function runPresent<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  value: P,
  field: string | undefined,
  input: unknown,
): MaybePromise<Result<T | V, E>> {
  for (const check of def.gate) {
    const checked = check(value, field);
    if (checked.state === 'invalid') {
      return wordOwn(def.messages, checked);
    }
  }

  return andThen(def.children(value, field), (done) =>
    runTests(def, exit, done, field, input),
  );
}
