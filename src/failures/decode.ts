import type { Failure } from '../shared.js';
import type { StandardSchemaV1 } from '../standard-schema.js';
import { readFailure } from './read.js';
import { entriesOf, isContainer, type Visits } from './walk.js';

/**
 * A Standard Schema issue with its failure's `code` and `params`.
 * @internal
 */
type Issue = StandardSchemaV1.Issue & {
  readonly code: string;
  readonly params: Record<string, unknown>;
};

/**
 * A leaf failure in an errors tree with the path to it.
 * @internal
 */
type Leaf = [made: Failure<unknown>, path: PropertyKey[]];

/**
 * Adds a failure's leaves to `found`: its children's for an `items` or
 * `properties` failure, or itself for a leaf and for one whose tree holds no
 * failure.
 * @internal
 */
function collectLeaves(
  made: Failure<unknown>,
  path: PropertyKey[],
  found: Leaf[],
  visits: Visits,
) {
  const before = found.length;
  if (isContainer(made)) {
    for (const [key, child] of entriesOf(made.errors, path.length, visits)) {
      if (child) {
        collectLeaves(child, [...path, key], found, visits);
      }
    }
  }

  if (found.length === before) {
    found.push([made, path]);
  }
}

/**
 * Each leaf in a failure's errors tree with its path. An `items` or
 * `properties` failure whose tree holds no failure counts as a leaf.
 * @internal
 */
function leavesOf(made: Failure<unknown>): Leaf[] {
  const found: Leaf[] = [];
  collectLeaves(readFailure(made, "A validator's result"), [], found, {
    entries: 0,
  });
  return found;
}

/**
 * A failure's Standard Schema issues: one for each leaf in its errors tree,
 * with its code, params and path.
 * @internal
 */
export function issues(made: Failure<unknown>): Issue[] {
  return leavesOf(made).map(([{ message, code, params }, path]) =>
    path.length > 0
      ? { message, code, params, path }
      : { message, code, params },
  );
}
