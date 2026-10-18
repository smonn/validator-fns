import { issues } from '../failures/index.js';
import type { Validator } from '../shared.js';
import type { StandardSchemaV1 } from '../standard-schema.js';

/**
 * A validator that is also a Standard Schema (https://standardschema.dev),
 * as every type validator is.
 * @category Types
 */
export type TypeValidator<T, E> = Validator<T, E> &
  StandardSchemaV1<unknown, T>;

/**
 * Validators that carry this library's `~standard`, so `createValidator()`
 * returns them as they are.
 * @internal
 */
const carriers = new WeakSet<object>();

/**
 * Whether `withStandard` added `~standard` to validator, which it does with
 * validator's own value type.
 * @internal
 */
function isTypeValidator<T, E>(
  validator: Validator<T, E>,
): validator is TypeValidator<T, E> {
  return carriers.has(validator);
}

/**
 * Adds `~standard` to validator itself and returns it.
 * @internal
 */
export function withStandard<T, E>(
  validator: Validator<T, E>,
): TypeValidator<T, E> {
  const validate = async (
    value: unknown,
  ): Promise<StandardSchemaV1.Result<T>> => {
    const result = await validator(value);
    if (result.state === 'valid') {
      return { value: result.value };
    }

    return { issues: issues(result) };
  };

  const typeValidator = Object.assign(validator, {
    '~standard': { version: 1, vendor: 'validator-fns', validate } as const,
  });
  carriers.add(typeValidator);
  return typeValidator;
}

/**
 * Makes a custom validator from an async function that takes a value and a
 * field name and returns a validation result. The validator is also a Standard
 * Schema (https://standardschema.dev), like the built-in ones, and `fn` itself
 * is unchanged. A validator that already has this library's `~standard`, such
 * as a type validator, is returned as it is.
 * @param fn Function that validates a value
 * @category Helpers
 */
export function createValidator<T, E>(
  fn: Validator<T, E>,
): TypeValidator<T, E> {
  if (isTypeValidator(fn)) {
    return fn;
  }

  return withStandard((value?: unknown, field?: string) => fn(value, field));
}
