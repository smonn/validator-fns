import {
  type Failure,
  type Result,
  setOwn,
  type ValidatorMessage,
} from '../shared.js';
import { readFailure } from './read.js';
import { reword } from './reword.js';
import { entriesOf, isContainer, type Visits } from './walk.js';

/**
 * A translation's messages, keyed by code, as `withMessages()` reads them
 * once.
 * @internal
 */
export type Translation = ReadonlyMap<
  string,
  ValidatorMessage<unknown, Record<string, unknown>>
>;

/**
 * One fill's translation, its visits so far, and each failure it has filled,
 * so a failure shared by several entries is filled once.
 * @internal
 */
type Fill = {
  translation: Translation;
  visits: Visits;
  filled: Map<Failure<unknown>, Failure<unknown>>;
};

/**
 * @param depth How many containers hold `made`
 * @internal
 */
function fillFailure(
  made: Failure<unknown>,
  depth: number,
  fill: Fill,
): Failure<unknown> {
  const known = fill.filled.get(made);
  if (known !== undefined) {
    return known;
  }

  const errors = isContainer(made)
    ? fillErrors(made.errors, depth, fill)
    : made.errors;
  const filled = reword(made, fill.translation.get(made.code), errors);
  fill.filled.set(made, filled);
  return filled;
}

/**
 * A container's errors tree with each child filled, or the tree itself when
 * no child changed.
 * @internal
 */
function fillErrors(errors: unknown, depth: number, fill: Fill): unknown {
  const tree = Array.isArray(errors) ? [] : {};
  let changed = false;
  for (const [key, child] of entriesOf(errors, depth, fill.visits)) {
    const filled = child && fillFailure(child, depth + 1, fill);
    // Not changed ||= ..., which the minifier would emit and Safari 13.1 and
    // Firefox 77, both supported, can't parse.
    if (filled !== child) {
      changed = true;
    }
    setOwn(tree, key, filled);
  }

  return changed ? tree : errors;
}

/**
 * Words each failure in a result's errors tree that was made without a
 * message from `translation`, by code, children first. A failure with a
 * message, or a copy made with spread, stays as it is. The fill keeps every
 * tree's shape and leaves the failures it reads unchanged, so the result
 * keeps its types. A tree the decoders would reject throws the same
 * `TypeError` (ADR 0001).
 * @internal
 */
export function fillTree<T, E>(
  result: Result<T, E>,
  translation: Translation,
): Result<T, E>;
export function fillTree(result: Result, translation: Translation): Result {
  if (result.state === 'valid') {
    return result;
  }

  return fillFailure(readFailure(result, "A validator's result"), 0, {
    translation,
    visits: { entries: 0 },
    filled: new Map(),
  });
}
