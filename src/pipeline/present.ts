import { fillOwn } from '../failures/index.js';
import type { Messages, Result } from '../shared.js';
import { type Def, type Exit, isMissing } from './def.js';
import { isThenable, type Maybe, runSteps } from './steps.js';

/**
 * A type validator's own result, a failure worded by its `messages`.
 * @internal
 */
export function own<T, E>(
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
function afterChildren<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  children: Result<T, E>,
  field: string | undefined,
  input: unknown,
): Maybe<Result<T | V, E>> {
  if (children.state === 'invalid') {
    return isMissing(input) && def.build !== undefined
      ? exit(input, field, def.messages)
      : own(def.messages, children);
  }
  if (def.steps.length === 0) {
    return children;
  }

  const result = runSteps(def.steps, children.value, field);
  return isThenable(result)
    ? result.then((done) => own(def.messages, done))
    : own(def.messages, result);
}

/**
 * Runs the gate, the children and the tests on a read value, or on the value
 * that fills missing input.
 * @internal
 */
export function present<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
  value: P,
  field: string | undefined,
  input: unknown,
): Maybe<Result<T | V, E>> {
  for (const check of def.gate) {
    const checked = check(value, field);
    if (checked.state === 'invalid') {
      return own(def.messages, checked);
    }
  }

  const children = def.children(value, field);
  return isThenable(children)
    ? children.then((done) => afterChildren(def, exit, done, field, input))
    : afterChildren(def, exit, children, field, input);
}
