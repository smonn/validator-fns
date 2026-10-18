import type { Result, Validator } from '../shared.js';

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
 * Makes a validator from a run. A throw rejects rather than escapes the call.
 * Not an async function, which would wait extra ticks for the promise a run
 * returns.
 * @internal
 */
export function toValidator<T, E>(run: Run<T, E>): Validator<T, E> {
  return (value, field) => {
    try {
      return Promise.resolve(run(value, field));
    } catch (error) {
      return Promise.reject(error);
    }
  };
}
