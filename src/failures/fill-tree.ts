import type { Result } from '../types.js';
import { fillFailure, type Translation } from './fill.js';
import { readFailure } from './read.js';

/**
 * Words each failure in a result's errors tree that was made without a
 * message from `translation`, by code, children first. A failure with a
 * message, or a copy made with spread, stays as it is. A tree the decoders
 * would reject throws the same `TypeError` (ADR 0001).
 *
 * The overload is an unchecked assertion: a filled failure keeps its code,
 * params and field, and each tree it rebuilds keeps the keys and entries of
 * the one it replaces, with only messages changed, so the result has the
 * type `Result<T, E>` it came with. The walk reads each tree as entries of
 * `unknown` failures, which can't be typed back to `E`.
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
  }).made;
}
