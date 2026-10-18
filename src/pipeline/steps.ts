import { type Result, validResult } from '../shared.js';
import { afterPromise, isThenable, type MaybePromise } from './promises.js';
import type { Step } from './sync.js';

/**
 * The steps' result from the last step's: its failure, or its value with the
 * steps' field.
 * @internal
 */
function endSteps<T, E>(
  result: Result<T, E>,
  field: string | undefined,
): Result<T, E> {
  return result.state === 'invalid'
    ? result
    : validResult({ value: result.value, field });
}

/**
 * Runs the steps after `index` once the one before them returns a promise,
 * awaiting only the steps that return one.
 * @internal
 */
async function finishSteps<T, E>(
  steps: readonly Step<T, E>[],
  index: number,
  pending: PromiseLike<Result<T, E>>,
  field: string | undefined,
): Promise<Result<T, E>> {
  let result = await pending;
  for (const step of steps.slice(index)) {
    if (result.state === 'invalid') {
      return result;
    }
    const next = step(result.value, field);
    // Not a ternary: @vitest/coverage-v8 gives the branch after an await in a
    // ternary arm a negative count.
    if (isThenable(next)) {
      result = await next;
    } else {
      result = next;
    }
  }

  return endSteps(result, field);
}

/**
 * Runs steps on a value in order. Each step's valid value goes to the next,
 * and the first failure ends the run. A built-in test's step is its twin, so
 * the run stays synchronous until a step returns a promise.
 * @internal
 */
export function runSteps<T, E>(
  steps: readonly Step<T, E>[],
  value: T,
  field: string | undefined,
): MaybePromise<Result<T, E>> {
  let current = value;
  let index = 0;
  for (const step of steps) {
    index += 1;
    const result = step(current, field);
    if (isThenable(result)) {
      // A promise from the last step needs one callback, which costs less
      // than the async loop.
      return index === steps.length
        ? afterPromise(result, (done) => endSteps(done, field))
        : finishSteps(steps, index, result, field);
    }
    if (result.state === 'invalid') {
      return result;
    }
    current = result.value;
  }

  return validResult({ value: current, field });
}
