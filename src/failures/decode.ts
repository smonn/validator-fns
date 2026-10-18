import type { Failure } from '../shared.js';

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
