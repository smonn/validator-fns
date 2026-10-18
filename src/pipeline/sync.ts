import type { Result, Test } from '../shared.js';
import type { MaybePromise } from './promises.js';

/**
 * A test's synchronous twin. The twins never set errors, so their error type
 * is never.
 * @internal
 */
export type Twin<T> = (value: T, field: string | undefined) => Result<T, never>;

/**
 * The synchronous twin of each test `withSyncTwin` makes. A type validator
 * runs a test's twin in its place, which keeps a run of built-in tests
 * synchronous (#523). The tests themselves stay async. Keyed by identity, so
 * a Proxy of a test, or a function with a test's properties assigned, runs as
 * itself (#794).
 * @internal
 */
const twins = new WeakMap<
  object,
  (value: never, field: string | undefined) => Result<unknown, never>
>();

/**
 * Makes a test from its synchronous twin, which the step loop runs in its
 * place.
 * @internal
 */
export function withSyncTwin<T, E>(twin: Twin<T>): Test<T, E> {
  const validationTest: Test<T, E> = async (value, field) => twin(value, field);
  twins.set(validationTest, twin);
  return validationTest;
}

/**
 * A test's synchronous twin, or `undefined` for a test `withSyncTwin` didn't
 * make.
 * @internal
 */
export function twinOf<T>(test: Step<T, unknown>): Twin<T> | undefined;
export function twinOf(test: object) {
  return twins.get(test);
}

/**
 * A test as the step loop runs it: its twin, or else the test.
 * @internal
 */
export type Step<T, E> = (
  value: T,
  field: string | undefined,
) => MaybePromise<Result<T, E>>;

/**
 * The step a test runs as: its twin, or else the test itself.
 * @internal
 */
export function stepOf<T, E>(step: Step<T, E>): Step<T, E> {
  return twinOf(step) ?? step;
}
