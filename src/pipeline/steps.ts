import { type Result, type Test, validResult } from '../shared.js';

/**
 * A result, or a promise of one once a step or child is async.
 * @internal
 */
export type MaybePromise<T> = T | PromiseLike<T>;

/**
 * A validator's run, which returns a result synchronously until a step or
 * child returns a promise.
 * @internal
 */
export type Run<T, E> = (
  value: unknown,
  field: string | undefined,
) => MaybePromise<Result<T, E>>;

/**
 * Whether a step or child returned a promise: a value with a `then` function,
 * as a promise from another realm isn't an instance of this realm's Promise.
 * @internal
 */
export function isThenable<T extends object>(
  value: MaybePromise<T>,
): value is PromiseLike<T> {
  return 'then' in value && typeof value.then === 'function';
}

/**
 * Runs `next` on a result, once it settles when it's a promise. A promise is
 * adopted as `await` would, so a thenable that isn't a Promise is called once,
 * and its first callback alone counts.
 * @internal
 */
export function andThen<T extends object, R>(
  result: MaybePromise<T>,
  next: (done: T) => MaybePromise<R>,
): MaybePromise<R> {
  return isThenable(result) ? Promise.resolve(result).then(next) : next(result);
}

/**
 * Key for the synchronous twin of each test `withSyncTwin` makes. The step
 * loop runs a test's twin when it has one, which keeps a run of built-in tests
 * synchronous (#523). The tests themselves stay async. Module-private, so only
 * tests made here carry it.
 * @internal
 */
const syncTwin = Symbol('sync');

/**
 * A test's synchronous twin. The twins never set errors, so their error type
 * is never.
 * @internal
 */
export type Twin<T> = (value: T, field: string | undefined) => Result<T, never>;

/**
 * A test made by `withSyncTwin`.
 * @internal
 */
export type Twinned<T> = { readonly [syncTwin]: Twin<T> };

/**
 * Makes a test from its synchronous twin, which the step loop runs in its
 * place.
 * @internal
 */
export function withSyncTwin<T, E>(twin: Twin<T>): Test<T, E> {
  const validationTest: Test<T, E> = async (value, field) => twin(value, field);
  return Object.assign(validationTest, { [syncTwin]: twin });
}

/**
 * A test's synchronous twin.
 * @internal
 */
export function twinOf<T>(test: Twinned<T>): Twin<T> {
  return test[syncTwin];
}

/**
 * Runs a step, or its twin in its place.
 * @internal
 */
function runStep<T, E>(
  step: Test<T, E> & Partial<Twinned<T>>,
  value: T,
  field: string | undefined,
): MaybePromise<Result<T, E>> {
  const twin = step[syncTwin];
  return twin ? twin(value, field) : step(value, field);
}

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
  steps: readonly (Test<T, E> & Partial<Twinned<T>>)[],
  index: number,
  pending: PromiseLike<Result<T, E>>,
  field: string | undefined,
): Promise<Result<T, E>> {
  let result = await pending;
  for (const step of steps.slice(index)) {
    if (result.state === 'invalid') {
      return result;
    }
    const next = runStep(step, result.value, field);
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
 * and the first failure ends the run. A step's twin runs in its place, so the
 * run stays synchronous until a step returns a promise.
 * @internal
 */
export function runSteps<T, E>(
  steps: readonly (Test<T, E> & Partial<Twinned<T>>)[],
  value: T,
  field: string | undefined,
): MaybePromise<Result<T, E>> {
  let current = value;
  let index = 0;
  for (const step of steps) {
    index += 1;
    const result = runStep(step, current, field);
    if (isThenable(result)) {
      // A promise from the last step needs one callback, which costs less
      // than the async loop.
      return index === steps.length
        ? Promise.resolve(result).then((done) => endSteps(done, field))
        : finishSteps(steps, index, result, field);
    }
    if (result.state === 'invalid') {
      return result;
    }
    current = result.value;
  }

  return validResult({ value: current, field });
}
