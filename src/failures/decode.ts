import type { Failure } from '../shared.js';
import type { StandardSchemaV1 } from '../standard-schema.js';

/**
 * A Standard Schema issue with its failure's `code` and `params`.
 * @internal
 */
type Issue = StandardSchemaV1.Issue & {
  readonly code: string;
  readonly params: Record<string, unknown>;
};

/**
 * Whether a failure is a container's, failed through its children, so that
 * its `errors` hold theirs: `items` for an array and `properties` for an
 * object.
 * @internal
 */
export function isContainer(made: Failure<unknown>): boolean {
  return (
    (made.code === 'items' || made.code === 'properties') &&
    made.errors !== undefined
  );
}

/** @internal */
function isFailure(entry: unknown): entry is Failure<unknown> {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    Reflect.get(entry, 'state') === 'invalid'
  );
}

/**
 * Each entry of a container's errors tree with its key: an array index or an
 * own property name. A tree that isn't an object, or an entry that is neither
 * a failure nor `null`, is a bug in the code that built it, so it throws
 * (ADR 0001).
 * @internal
 */
export function entriesOf(
  errors: unknown,
): [PropertyKey, Failure<unknown> | null][] {
  if (typeof errors !== 'object' || errors === null) {
    throw new TypeError(
      `An errors tree must be an object, not ${typeof errors}`,
    );
  }

  // Object.keys rather than Object.entries, which would add an ES2017
  // built-in to the supported environments list.
  const keys = Array.isArray(errors) ? [...errors.keys()] : Object.keys(errors);
  return keys.map((key) => {
    const entry: unknown = Reflect.get(errors, key);
    if (entry !== null && !isFailure(entry)) {
      throw new TypeError(`The errors tree entry at ${key} isn't a failure`);
    }

    return [key, entry];
  });
}

/** @internal */
function collectIssues(
  made: Failure<unknown>,
  path: PropertyKey[],
  found: Issue[],
) {
  if (!isContainer(made)) {
    const { message, code, params } = made;
    found.push(
      path.length > 0
        ? { message, code, params, path }
        : { message, code, params },
    );
    return;
  }

  for (const [key, child] of entriesOf(made.errors)) {
    if (child) {
      collectIssues(child, [...path, key], found);
    }
  }
}

/**
 * A failure's Standard Schema issues: one for each leaf in its errors tree,
 * with its code, params and path. A container whose tree holds no failure
 * reports itself.
 * @internal
 */
export function issues(made: Failure<unknown>): Issue[] {
  const found: Issue[] = [];
  collectIssues(made, [], found);
  const { message, code, params } = made;
  return found.length > 0 ? found : [{ message, code, params }];
}
