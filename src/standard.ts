import type { ValidatorTest } from './shared.js';
import type { StandardSchemaV1 } from './standard-schema.js';

/** @internal */
const fallbackMessage = 'Invalid value.';

/**
 * Turns the `errors` of an invalid result into issues: object keys and array
 * indexes become path segments, and each string becomes an issue. `null` marks
 * a valid array item. An empty string, which v3 records for a failure without
 * a message, and any other value get a fallback message.
 * @internal
 */
function collectIssues(
  errors: unknown,
  path: PropertyKey[],
  issues: StandardSchemaV1.Issue[],
) {
  if (typeof errors === 'string') {
    issues.push({ message: errors || fallbackMessage, path });
  } else if (Array.isArray(errors)) {
    for (const [index, item] of errors.entries()) {
      if (item !== null) {
        collectIssues(item, [...path, index], issues);
      }
    }
  } else if (typeof errors === 'object' && errors !== null) {
    // Object.keys rather than Object.entries, which would add an ES2017
    // built-in to the supported environments list.
    for (const key of Object.keys(errors)) {
      collectIssues(Reflect.get(errors, key), [...path, key], issues);
    }
  } else {
    issues.push({ message: fallbackMessage, path });
  }
}

/**
 * A validator that is also a Standard Schema (https://standardschema.dev),
 * as every type validator is.
 * @category Types
 */
export type TypeValidator<T, E> = ValidatorTest<T, E> &
  StandardSchemaV1<unknown, T>;

/**
 * Validators that carry this library's `~standard`, so `standard()` returns
 * them as they are.
 * @internal
 */
const carriers = new WeakSet<object>();

/**
 * Whether `withStandard` added `~standard` to validator, which it does with
 * validator's own value type.
 * @internal
 */
function isTypeValidator<T, E>(
  validator: ValidatorTest<T, E>,
): validator is TypeValidator<T, E> {
  return carriers.has(validator);
}

/**
 * Adds `~standard` to validator itself and returns it.
 * @internal
 */
export function withStandard<T, E>(
  validator: ValidatorTest<T, E>,
): TypeValidator<T, E> {
  const validate = async (
    value: unknown,
  ): Promise<StandardSchemaV1.Result<T>> => {
    const result = await validator(value);
    if (result.state === 'valid') {
      return { value: result.value };
    }

    const issues: StandardSchemaV1.Issue[] = result.message
      ? [{ message: result.message }]
      : [];
    if (result.errors !== undefined) {
      collectIssues(result.errors, [], issues);
    }

    return {
      issues: issues.length > 0 ? issues : [{ message: fallbackMessage }],
    };
  };

  const typeValidator = Object.assign(validator, {
    '~standard': { version: 1, vendor: 'validator-fns', validate } as const,
  });
  carriers.add(typeValidator);
  return typeValidator;
}

/**
 * Adds the Standard Schema interface (https://standardschema.dev) to a
 * validator, so libraries that accept any Standard Schema can use it. Type
 * validators already have it and are returned as they are; any other validator
 * gets a new validator, and the one passed in is unchanged. `validate` always
 * returns a promise, since every validator here is async.
 * @category Helpers
 */
export function standard<T, E>(
  validator: ValidatorTest<T, E>,
): TypeValidator<T, E> {
  if (isTypeValidator(validator)) {
    return validator;
  }

  return withStandard((value?: unknown, field?: string) =>
    validator(value, field),
  );
}
