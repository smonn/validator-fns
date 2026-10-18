import type { Failure } from '../shared.js';
import type { StandardSchemaV1 } from '../standard-schema.js';
import { readFailure } from './read.js';

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

/**
 * Each entry of a container's errors tree with its key: an array index or an
 * own property name. A tree that isn't an object, or an entry that is neither
 * a whole failure nor `null`, is a bug in the code that built it, so it
 * throws (ADR 0001).
 * @internal
 */
export function entriesOf(
  errors: unknown,
): [PropertyKey, Failure<unknown> | null][] {
  if (typeof errors !== 'object' || errors === null) {
    throw new TypeError('An errors tree must be an object');
  }

  // Object.keys rather than Object.entries, which would add an ES2017
  // built-in to the supported environments list. An array's keys are read
  // one at a time, so a hole throws before the rest are listed.
  const keys = Array.isArray(errors) ? errors.keys() : Object.keys(errors);
  const entries: [PropertyKey, Failure<unknown> | null][] = [];
  for (const key of keys) {
    const entry: unknown = Reflect.get(errors, key);
    entries.push([
      key,
      entry === null
        ? null
        : readFailure(entry, `The errors tree entry at ${key}`),
    ]);
  }

  return entries;
}

/**
 * Adds a failure's issues to `found`: its children's for a container, or its
 * own for a leaf and for a container whose tree holds no failure.
 * @internal
 */
function collectIssues(
  made: Failure<unknown>,
  path: PropertyKey[],
  found: Issue[],
) {
  const before = found.length;
  if (isContainer(made)) {
    for (const [key, child] of entriesOf(made.errors)) {
      if (child) {
        collectIssues(child, [...path, key], found);
      }
    }
  }

  if (found.length === before) {
    const { message, code, params } = made;
    found.push(
      path.length > 0
        ? { message, code, params, path }
        : { message, code, params },
    );
  }
}

/**
 * A failure's Standard Schema issues: one for each leaf in its errors tree,
 * with its code, params and path. A container whose tree holds no failure
 * counts as a leaf.
 * @internal
 */
export function issues(made: Failure<unknown>): Issue[] {
  const found: Issue[] = [];
  collectIssues(readFailure(made, "A validator's result"), [], found);
  return found;
}
