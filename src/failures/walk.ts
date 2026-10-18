import type { Failure } from '../types.js';
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
 * Throws when a container sits `depth` containers deep, past `maxDepth`.
 * @internal
 */
export function checkDepth(depth: number): void {
  if (depth >= maxDepth) {
    throw new TypeError(`An errors tree is deeper than ${maxDepth} levels`);
  }
}

/**
 * How many entries one decode may visit. A child shared by several entries
 * is visited once for each, so a tree of a few failures can expand
 * exponentially; the bound caps that work.
 * @internal
 */
const maxEntries = 1_000_000;

/**
 * How many entries a decode has visited so far, across its whole walk.
 * @internal
 */
export type Visits = { entries: number };

/**
 * Each entry of a container's errors tree with its key: an array index or an
 * own property name. A tree that isn't an object, nests deeper than
 * `maxDepth`, takes more than `maxEntries` visits, or has an entry that is
 * neither a whole failure nor `null`, is a bug in the code that built it, so
 * it throws (ADR 0001).
 * @param depth How many containers hold this one
 * @param visits The decode's visits so far, counted up here
 * @internal
 */
export function entriesOf(
  errors: unknown,
  depth: number,
  visits: Visits,
): [PropertyKey, Failure<unknown> | null][] {
  checkDepth(depth);
  if (typeof errors !== 'object' || errors === null) {
    throw new TypeError('An errors tree must be an object');
  }

  // Object.keys rather than Object.entries, which would add an ES2017
  // built-in to the supported environments list. An array's keys are read
  // one at a time, so a hole throws before the rest are listed.
  const keys = Array.isArray(errors) ? errors.keys() : Object.keys(errors);
  const entries: [PropertyKey, Failure<unknown> | null][] = [];
  for (const key of keys) {
    visits.entries += 1;
    if (visits.entries > maxEntries) {
      throw new TypeError(`An errors tree has more than ${maxEntries} entries`);
    }

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
