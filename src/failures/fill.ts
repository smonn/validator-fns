import { type Failure, setOwn, type ValidatorMessage } from '../shared.js';
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
 * `made` with its errors tree filled, or what it was filled to when another
 * entry holds it too.
 * @param depth How many containers hold `made`
 * @internal
 */
export function fillFailure(
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
