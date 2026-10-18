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
  return typeof Reflect.get(value, 'then') === 'function';
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
  for (const [index, step] of steps.entries()) {
    const twin = step[syncTwin];
    const result = twin ? twin(current, field) : step(current, field);
    if (isThenable(result)) {
      return Promise.resolve(result).then((done) =>
        done.state === 'invalid'
          ? done
          : runSteps(steps.slice(index + 1), done.value, field),
      );
    }
    if (result.state === 'invalid') {
      return result;
    }
    current = result.value;
  }

  return validResult({ value: current, field });
}
