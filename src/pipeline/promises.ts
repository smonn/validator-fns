import { hasOwnProperty, type Result, type Validator } from '../shared.js';

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
 * Whether a step or child returned a promise: a value with a `then`, as a
 * promise from another realm isn't an instance of this realm's Promise. `in`
 * calls no getter, so `then` is read only to adopt the promise.
 * @internal
 */
export function isThenable<T extends object>(
  value: MaybePromise<T>,
): value is PromiseLike<T> {
  return 'then' in value;
}

/** @internal */
async function awaitThen<T, R>(
  promise: PromiseLike<T>,
  next: (done: T) => MaybePromise<R>,
): Promise<R> {
  return next(await promise);
}

/**
 * Runs `next` on a promised result once it settles, adopting it as `await`
 * would: a thenable's `then` is read once, and a Promise's own `then` not at
 * all. One with its own `then` is awaited; any other goes through
 * `Promise.resolve()`, which costs less.
 * @internal
 */
export function afterPromise<T, R>(
  promise: PromiseLike<T>,
  next: (done: T) => MaybePromise<R>,
): Promise<R> {
  return hasOwnProperty(promise, 'then')
    ? awaitThen(promise, next)
    : Promise.resolve(promise).then(next);
}

/**
 * Runs `next` on a result, once it settles when it's a promise.
 * @internal
 */
export function andThen<T extends object, R>(
  result: MaybePromise<T>,
  next: (done: T) => MaybePromise<R>,
): MaybePromise<R> {
  return isThenable(result) ? afterPromise(result, next) : next(result);
}

/**
 * How many type validators' runs, built-in or custom, are running one inside
 * another, as a schema's children or a recursive schema's custom validator
 * calling the schema.
 * @internal
 */
let nesting = 0;

// Past this nesting, a run starts on a later microtask, unwinding the stack.
const maxNesting = 100;

/**
 * Guards a type validator's run, so a run nested past `maxNesting` starts on a
 * later microtask instead, however the schema nests.
 * @internal
 */
export function guardRun<T, E>(run: Run<T, E>): Run<T, E> {
  const guarded: Run<T, E> = (value, field) => {
    if (nesting >= maxNesting) {
      return Promise.resolve().then(() => guarded(value, field));
    }
    nesting += 1;
    try {
      return run(value, field);
    } finally {
      nesting -= 1;
    }
  };
  return guarded;
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
