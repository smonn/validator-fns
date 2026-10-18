import type { Validator } from '../shared.js';
import { type Def, type Exit, keepValue, reject } from './def.js';
import { runType } from './run.js';
import { type TypeValidator, withStandard } from './standard.js';
import { type Run, toValidator } from './promises.js';

/**
 * Key for what the pipeline keeps on each type validator it builds: its run,
 * and the rebuild of its def that `optional()` returns. Module-private, so
 * only validators built here carry it.
 * @internal
 */
const built = Symbol('pipeline');

/** @internal */
type Built<T, E> = {
  readonly [built]?: {
    run: Run<T, E>;
    optional: () => TypeValidator<T | null | undefined, E>;
  };
};

/**
 * Builds a type validator from its def, with `exit` for missing input.
 * @internal
 */
function build<T, E, P, V>(
  def: Def<T, E, P>,
  exit: Exit<V, E>,
): TypeValidator<T | V, E> & Built<T | V, E> {
  const run: Run<T | V, E> = (value, field) => runType(def, exit, value, field);
  const validator = withStandard(toValidator(run));
  // Rebuilt once, on the first optional() call, so each call returns it.
  let rebuilt: TypeValidator<T | V | null | undefined, E> | undefined;
  const rebuild = () => {
    // Not ??=, which Safari 13.1 and Firefox 77, both supported, can't parse.
    if (rebuilt === undefined) {
      rebuilt = build(def, keepValue);
    }
    return rebuilt;
  };
  return Object.assign(validator, { [built]: { run, optional: rebuild } });
}

/**
 * Builds a type validator from its def. It fails missing input it can't fill
 * with `required`.
 * @internal
 */
export function defineType<T, E, P>(def: Def<T, E, P>): TypeValidator<T, E> {
  return build(def, reject<E>);
}

/**
 * A validator's run: its own for one built here, which stays synchronous, or
 * else the validator itself.
 * @internal
 */
export function runOf<T, E>(
  validator: Validator<T, E> & Built<T, E>,
): Run<T, E> {
  return validator[built]?.run ?? validator;
}

/**
 * The rebuild of a validator built here with the optional exit, which
 * `optional()` returns, or `undefined` for any other validator.
 * @internal
 */
export function optionalOf<T, E>(
  validator: Validator<T, E> & Built<T, E>,
): TypeValidator<T | null | undefined, E> | undefined {
  return validator[built]?.optional();
}
