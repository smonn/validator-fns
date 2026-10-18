import { type Failure, type Result, setOwn } from '../shared.js';
import { failure } from './make.js';

/**
 * The errors `check()` produces at `Path`: a `properties` failure for each
 * name, and the check's failure at the end, such as
 * `{ shipping?: Failure<{ zip?: Failure<never> }> }` for `['shipping', 'zip']`.
 * @internal
 */
export type AtPath<Path> = Path extends readonly [
  infer Head extends string,
  ...infer Rest,
]
  ? { [P in Head]?: Failure<AtPath<Rest>> }
  : never;

/**
 * The full field of a child, JS-style and unescaped: `user.a` and `user[1]`,
 * or `a` and `[1]` without a field.
 * @param field The container's field
 * @param key A property name, or an array index
 * @internal
 */
export function childField(
  field: string | undefined,
  key: string | number,
): string {
  if (typeof key === 'number') {
    return `${field ?? ''}[${key}]`;
  }

  return field ? `${field}.${key}` : key;
}

/**
 * An array's errors tree: each item's failure as it returned it, and `null`
 * for a valid item. `undefined` when every item is valid.
 * @internal
 */
export function itemsTree<E>(
  results: Result<unknown, E>[],
): (Failure<E> | null)[] | undefined {
  const tree = results.map((result) =>
    result.state === 'invalid' ? result : null,
  );
  return tree.some((entry) => entry !== null) ? tree : undefined;
}

/**
 * Fills `tree`, typed by the caller as the object's errors, with each failed
 * property's failure as it returned it, as own keys in the order given.
 * `undefined` when every property is valid.
 * @internal
 */
export function propertiesTree<Tree extends object>(
  results: [key: string, result: Result][],
  tree: Tree,
): Tree | undefined {
  let isValid = true;
  for (const [key, result] of results) {
    if (result.state === 'invalid') {
      isValid = false;
      setOwn(tree, key, result);
    }
  }

  return isValid ? undefined : tree;
}

/**
 * Wraps a `check()` failure, made with the full field, in an unworded
 * `properties` failure for each name in `path`. Only the outermost, the
 * object's own, gets `value` for its message.
 * @internal
 */
export function nestAt(
  path: readonly string[],
  made: Failure<unknown>,
  field: string | undefined,
  value?: unknown,
): Failure<unknown> {
  const [key, ...rest] = path;
  if (key === undefined) {
    return made;
  }

  const errors = {};
  setOwn(errors, key, nestAt(rest, made, childField(field, key)));
  return failure({ code: 'properties', params: {}, value, field, errors });
}
