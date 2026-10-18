import { isContainer } from './failures/index.js';
import type { Failure, Validator } from './shared.js';
import type { StandardSchemaV1 } from './standard-schema.js';

/**
 * An issue, with the failure's `code` and `params` when it has them.
 * @internal
 */
type Issue = StandardSchemaV1.Issue & {
  readonly code?: string;
  readonly params?: Record<string, unknown>;
};

/**
 * Turns the `errors` of an invalid result into issues: object keys and array
 * indexes become path segments, and each string becomes an issue. `null` marks
 * a valid array item. Any other value gets `code`, the failed result's code,
 * as its message.
 * @internal
 */
function collectIssues(
  errors: unknown,
  path: PropertyKey[],
  issues: Issue[],
  code: string,
) {
  if (typeof errors === 'string') {
    issues.push({ message: errors, path });
  } else if (Array.isArray(errors)) {
    for (const [index, item] of errors.entries()) {
      if (item !== null) {
        collectIssues(item, [...path, index], issues, code);
      }
    }
  } else if (typeof errors === 'object' && errors !== null) {
    // Object.keys rather than Object.entries, which would add an ES2017
    // built-in to the supported environments list.
    for (const key of Object.keys(errors)) {
      collectIssues(Reflect.get(errors, key), [...path, key], issues, code);
    }
  } else {
    issues.push({ message: code, path });
  }
}

/**
 * The issues of a failure: its own, with its code and params, then one for
 * each error in `errors`. A container reports only its children's.
 * @internal
 */
function issuesOf(failure: Failure<unknown>): Issue[] {
  const { code, params, message, errors } = failure;
  const issues: Issue[] = isContainer(failure)
    ? []
    : [{ message, code, params }];
  if (errors !== undefined) {
    collectIssues(errors, [], issues, code);
  }

  return issues.length > 0 ? issues : [{ message, code, params }];
}

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

    return { issues: issuesOf(result) };
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
