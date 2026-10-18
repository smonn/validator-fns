import type { Validator } from '../types.js';
import { type Def, type Exit, keepValue, reject } from './def.js';
import { runType } from './run.js';
import { type TypeValidator, withStandard } from './standard.js';
import { guardRun } from './nesting.js';
import { stepOf } from './sync.js';
import { type Run, toValidator } from './promises.js';

/**
 * What the pipeline keeps for each type validator it builds: its run, and the
 * rebuild of its def that `optional()` returns.
 * @internal
 */
type Built<T, E> = {
  run: Run<T, E>;
  optional: () => TypeValidator<T | null | undefined, E>;
};

/** Gives input as it is, in place of a coerce twin's reading. */
const same = (input: unknown) => input;

/**
 * Each type validator built here, by its identity, so a Proxy of one or a
 * function with one's properties assigned runs as itself.
 * @internal
 */
const registry = new WeakMap<object, Built<unknown, unknown>>();

/**
 * Makes a type validator from its run, guarded, and registers the run and
 * `rebuild`, which `optional()` calls once and returns on every call.
 * @internal
 */
export function fromRun<T, E>(
  unguarded: Run<T, E>,
  rebuild: () => TypeValidator<T | null | undefined, E>,
): TypeValidator<T, E> {
  const run = guardRun(unguarded);
  const validator = withStandard(toValidator(run));
  let rebuilt: TypeValidator<T | null | undefined, E> | undefined;
  const optional = () => (rebuilt ??= rebuild());
  registry.set(validator, { run, optional });
  return validator;
}

/**
 * Builds a type validator from its def, with `exit` for missing input. A
 * coerce twin's run reads the input first.
 * @internal
 */
function build<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
): TypeValidator<T | V, E> {
  const { coerce = same } = def;
  return fromRun<T | V, E>(
    (value, field) => runType(def, exit, coerce(value), field),
    () => build(def, keepValue),
  );
}

/**
 * Builds a type validator from its def. It fails missing input it can't fill
 * with `required`.
 * @internal
 */
export function defineType<T, E, P>(def: Def<T, E, P>): TypeValidator<T, E> {
  // Each test's twin, looked up once here instead of on every run.
  return build({ ...def, steps: def.steps.map(stepOf) }, reject<E>);
}

/**
 * What the pipeline keeps for a validator built here, or `undefined` for any
 * other validator.
 * @internal
 */
function builtOf<T, E>(validator: Validator<T, E>): Built<T, E> | undefined;
function builtOf(validator: object): Built<unknown, unknown> | undefined {
  return registry.get(validator);
}

/**
 * A validator's run: its own for one built here, which stays synchronous, or
 * else the validator itself.
 * @internal
 */
export function runOf<T, E>(validator: Validator<T, E>): Run<T, E> {
  return builtOf(validator)?.run ?? validator;
}

/**
 * The rebuild of a validator built here with the optional exit, which
 * `optional()` returns, or `undefined` for any other validator.
 * @internal
 */
export function optionalOf<T, E>(
  validator: Validator<T, E>,
): TypeValidator<T | null | undefined, E> | undefined {
  return builtOf(validator)?.optional();
}
