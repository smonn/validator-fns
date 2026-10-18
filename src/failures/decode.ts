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
 * A container's errors tree: an array's items, `null` when valid, or an
 * object's failed properties.
 * @internal
 */
type Children = (Failure<unknown> | null)[] | Record<string, Failure<unknown>>;

/** @internal */
type Container = Failure<Children> & { errors: Children };

/**
 * Whether a failure is a container's, failed through its children, so that
 * its `errors` hold theirs: `items` for an array and `properties` for an
 * object. Their entries are failures; a hand-built container with any other
 * entry is a bug, and reading it throws or misreads (ADR 0001).
 * @internal
 */
export function isContainer(made: Failure<unknown>): made is Container {
  return (
    (made.code === 'items' || made.code === 'properties') &&
    made.errors !== undefined
  );
}

/**
 * Each entry of a container's errors tree with its key: an array index or a
 * property name.
 * @internal
 */
export function entriesOf(
  errors: Children,
): [PropertyKey, Failure<unknown> | null][] {
  if (Array.isArray(errors)) {
    return errors.map((child, index): [number, Failure<unknown> | null] => [
      index,
      child,
    ]);
  }

  // Object.keys rather than Object.entries, which would add an ES2017
  // built-in to the supported environments list.
  return Object.keys(errors).map((key) => [key, Reflect.get(errors, key)]);
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
