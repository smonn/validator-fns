import { type Failure, setOwn, type ValidatorMessage } from '../types.js';
import { reword } from './reword.js';
import { checkDepth, entriesOf, isContainer, type Visits } from './walk.js';

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
 * A failure as filled, and how many levels of containers it holds, itself
 * included.
 * @internal
 */
type Filled = { made: Failure<unknown>; height: number };

/**
 * One fill's translation, its visits so far, and each failure it has filled,
 * so a failure shared by several entries is filled once.
 * @internal
 */
type Fill = {
  translation: Translation;
  visits: Visits;
  filled: Map<Failure<unknown>, Filled>;
};

/**
 * `made` with its errors tree filled, and its height, or what it was filled
 * to when another entry holds it too.
 * @param depth How many containers hold `made`
 * @internal
 */
export function fillFailure(
  made: Failure<unknown>,
  depth: number,
  fill: Fill,
): Filled {
  const known = fill.filled.get(made);
  if (known !== undefined) {
    // Filled once, but each entry that reuses it holds it at its own depth.
    checkDepth(depth + known.height - 1);
    return known;
  }

  const { errors, height } = isContainer(made)
    ? fillErrors(made.errors, depth, fill)
    : { errors: made.errors, height: 0 };
  const filled = {
    made: reword(made, fill.translation.get(made.code), errors),
    height,
  };
  fill.filled.set(made, filled);
  return filled;
}

/**
 * A container's errors tree with each child filled, or the tree itself when
 * no child changed, and the container's height.
 * @internal
 */
function fillErrors(
  errors: unknown,
  depth: number,
  fill: Fill,
): { errors: unknown; height: number } {
  const tree = Array.isArray(errors) ? [] : {};
  let changed = false;
  let height = 1;
  for (const [key, child] of entriesOf(errors, depth, fill.visits)) {
    if (child === null) {
      setOwn(tree, key, null);
      continue;
    }

    const filled = fillFailure(child, depth + 1, fill);
    height = Math.max(height, filled.height + 1);
    // Not changed ||= ..., which the minifier would emit and Safari 13.1 and
    // Firefox 77, both supported, can't parse.
    if (filled.made !== child) {
      changed = true;
    }
    setOwn(tree, key, filled.made);
  }

  return { errors: changed ? tree : errors, height };
}
