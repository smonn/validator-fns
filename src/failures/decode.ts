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
 * Adds a failure's issues to `found`: its children's for a container, or its
 * own for a leaf and for a container whose tree holds no failure.
 * @internal
 */
function collectIssues(
  made: Failure<unknown>,
  path: PropertyKey[],
  found: Issue[],
  visits: Visits,
) {
  const before = found.length;
  if (isContainer(made)) {
    for (const [key, child] of entriesOf(made.errors, path.length, visits)) {
      if (child) {
        collectIssues(child, [...path, key], found, visits);
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
  collectIssues(readFailure(made, "A validator's result"), [], found, {
    entries: 0,
  });
  return found;
}
