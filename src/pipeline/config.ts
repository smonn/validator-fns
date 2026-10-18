import type { Test } from '../types.js';

/**
 * Splits a type validator's arguments into its config and its tests.
 * @internal
 */
export function configAndTests<C extends object, T, E>(
  config: C | Test<T, E> | undefined,
  tests: Test<T, E>[],
): { config: Partial<C>; tests: Test<T, E>[] } {
  return typeof config === 'function'
    ? { config: {}, tests: [config, ...tests] }
    : { config: config ?? {}, tests };
}
