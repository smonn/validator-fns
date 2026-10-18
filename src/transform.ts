import { withSyncTwin } from './factories.js';
import { type Test, validResult } from './shared.js';

/**
 * Makes a test that changes the value and never fails. `fn` is synchronous and
 * keeps the type. A throw from `fn` is a bug, and the validator rejects with
 * it.
 * @param fn Function that returns the new value
 * @category Validation Tests
 */
export function transform<T, R extends NoInfer<T>>(
  // Excludes promises even when T is broad enough to hold one, such as unknown.
  fn: (value: T) => R extends PromiseLike<unknown> ? never : R,
): Test<T, never> {
  return withSyncTwin((value: T, field) =>
    validResult({ value: fn(value), field }),
  );
}
