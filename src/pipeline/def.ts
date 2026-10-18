import { failure, fillOwn } from '../failures/index.js';
import {
  type Failure,
  type Messages,
  type Result,
  validResult,
} from '../types.js';
import type { MaybePromise } from './promises.js';
import type { Step, Twin } from './sync.js';

/**
 * Turns present input into a type validator's type, `P`: a built-in's strict
 * check and the type it expects, or the validator `createTypeValidator()`
 * takes, whose failure is the type validator's own.
 * @internal
 */
export type Parser<P, E> =
  | {
      isType: (value: unknown) => value is P;
      expected: string;
      parser?: undefined;
    }
  | {
      parser: (
        value: unknown,
        field: string | undefined,
      ) => MaybePromise<Result<P | null | undefined, E>>;
      isType?: undefined;
    };

/**
 * Runs a collection's children on its read value, `P`, and gives its value,
 * `T`, or a failure whose errors tree holds each failed child's.
 * @internal
 */
export type Children<P, T, E> = (
  value: P,
  field: string | undefined,
) => MaybePromise<Result<T, E>>;

/**
 * How `object()` types its errors tree, made fresh for each failure, and its
 * value from the properties' values.
 * @internal
 */
export type Shape<V, Tree> = {
  tree: () => Tree;
  value: (values: Record<string, unknown>) => V;
};

/**
 * What a type validator supplies to the pipeline. `P` is the type its parser
 * gives, and `T` the type its children give, which its tests take.
 * @internal
 */
export type Def<T, E, P> = Parser<P, E> & {
  /**
   * A coerce twin's reading of the input, before the missing check. It gives
   * `undefined` for blank text, and passes on input it can't read as it is.
   */
  coerce?: ((input: unknown) => unknown) | undefined;
  /** Value for missing input. It skips the parser. */
  default?: P | undefined;
  /**
   * `object()`'s value for missing input. The children run on it, and when
   * one fails, the missing input is missing after all.
   */
  build?: P | undefined;
  /** Messages for the type validator's own failures, keyed by code. */
  messages?: Messages | undefined;
  /** Synchronous checks on the read value before any child runs. */
  gate: readonly Twin<P>[];
  /** Runs the children, or keeps the read value without them. */
  children: Children<P, T, E>;
  /**
   * The tests, which run once every child is valid. `defineType()` puts each
   * built-in test's twin in its place.
   */
  steps: readonly Step<T, E>[];
};

/**
 * What a type validator gives for missing input it can't fill: a `required`
 * failure, or for `optional()`, the missing value.
 * @internal
 */
export type Exit<V, E> = (
  value: null | undefined,
  field: string | undefined,
  messages: Messages | undefined,
) => Result<V, E>;

/**
 * Fails missing input with `required`, worded by `messages`.
 * @internal
 */
export function reject<E>(
  value: null | undefined,
  field: string | undefined,
  messages: Messages | undefined,
): Failure<E> {
  return fillOwn(
    failure<E>({ code: 'required', params: {}, value, field }),
    messages,
  );
}

/**
 * Keeps a value as it is: the read value of a type validator without
 * children, such as `array()` without an item validator, or missing input
 * for `optional()`.
 * @internal
 */
export function keepValue<V>(
  value: V,
  field: string | undefined,
): Result<V, never> {
  return validResult({ value, field });
}

/**
 * A built-in parser's `type` failure, with the type it expects.
 * @internal
 */
export function typeFailure(
  expected: string,
  value: unknown,
  field: string | undefined,
): Failure<never> {
  return failure({ code: 'type', params: { expected }, value, field });
}

/**
 * Whether a value is missing: `undefined` or `null` (ADR 0004).
 * @internal
 */
export function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
