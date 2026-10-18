import type { Result, Test } from '../shared.js';
import type { MaybePromise } from './promises.js';

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
export function runStep<T, E>(
  step: Test<T, E> & Partial<Twinned<T>>,
  value: T,
  field: string | undefined,
): MaybePromise<Result<T, E>> {
  const twin = step[syncTwin];
  return twin ? twin(value, field) : step(value, field);
}
