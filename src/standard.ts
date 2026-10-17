import type { Validator } from './shared.js';
import type { StandardSchemaV1 } from './standard-schema.js';

/** @internal */
const fallbackMessage = 'Invalid value.';

/**
 * Turns the `errors` of an invalid result into issues: object keys and array
 * indexes become path segments, and each string becomes an issue. `null` marks
 * a valid array item, and any other value gets a fallback message.
 * @internal
 */
function collectIssues(
  errors: unknown,
  path: PropertyKey[],
  issues: StandardSchemaV1.Issue[],
) {
  if (typeof errors === 'string') {
    issues.push({ message: errors, path });
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
 * Adds the Standard Schema interface (https://standardschema.dev) to a
 * validator, so libraries that accept any Standard Schema can use it. Returns a
 * new validator; the one passed in is unchanged. `validate` always returns a
 * promise, since every validator here is async.
 * @category Helpers
 */
export function standard<T, E>(
  validator: Validator<T, E>,
): Validator<T, E> & StandardSchemaV1<unknown, T | null | undefined> {
  const validate = async (
    value: unknown,
  ): Promise<StandardSchemaV1.Result<T | null | undefined>> => {
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

  return Object.assign(
    (value?: unknown, field?: string) => validator(value, field),
    {
      '~standard': { version: 1, vendor: 'validator-fns', validate } as const,
    },
  );
}
