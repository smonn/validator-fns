import { withSyncTwin } from './factories.js';
import { type Test, validResult } from './shared.js';

/**
 * Makes a test that changes the value: its valid value is what `fn` returns
 * for the value, and it never fails. `fn` is synchronous and keeps the type. A
 * throw from `fn` is a bug, and the validator rejects with it.
 * @param fn Function that returns the new value
 * @category Validation Tests
 */
export function transform<T>(fn: (value: T) => NoInfer<T>): Test<T, never> {
  return withSyncTwin((value: T, field) =>
    validResult({ value: fn(value), field }),
  );
}
