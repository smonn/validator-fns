import type { Failure } from '../shared.js';
import { readFailure } from './read.js';

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
 * How many containers an errors tree may nest, far beyond any schema. The
 * bound keeps a cyclic or hand-built tree from overflowing the stack.
 * @internal
 */
const maxDepth = 1000;

/**
 * Each entry of a container's errors tree with its key: an array index or an
 * own property name. A tree that isn't an object, nests deeper than
 * `maxDepth`, or has an entry that is neither a whole failure nor `null`, is
 * a bug in the code that built it, so it throws (ADR 0001).
 * @param depth How many containers hold this one
 * @internal
 */
export function entriesOf(
  errors: unknown,
  depth: number,
): [PropertyKey, Failure<unknown> | null][] {
  if (depth >= maxDepth) {
    throw new TypeError(`An errors tree is deeper than ${maxDepth} levels`);
  }

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
