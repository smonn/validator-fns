import { type Failure, type Result, setOwn } from '../shared.js';
import { entriesOf, isContainer } from './decode.js';

/**
 * The messages of a failure in an errors tree of type `F`: its message, or
 * its children's for a container. `null` stays `null` for a valid item.
 * @internal
 */
type FailureMessages<F> = F extends null
  ? null
  : F extends Failure<unknown>
    ? string | ChildMessages<Exclude<F['errors'], undefined>>
    : never;

/**
 * The messages of a container's children, in the shape of its errors type
 * `E`: an array, readonly or not, or an object type, interfaces included,
 * whose properties are failures. An `E` that holds no failures, such as a
 * custom failure's own data, has none.
 * @internal
 */
type ChildMessages<E> = unknown extends E
  ? unknown
  : E extends readonly (Failure<unknown> | null)[]
    ? FailureMessages<E[number]>[]
    : E extends { [K in keyof E]: Failure<unknown> | undefined }
      ? { [K in keyof E]: FailureMessages<E[K]> }
      : never;

/** @internal */
function messagesOf(made: Failure<unknown>): unknown {
  if (!isContainer(made)) {
    return made.message;
  }

  const tree = Array.isArray(made.errors) ? [] : {};
  for (const [key, child] of entriesOf(made.errors)) {
    setOwn(tree, key, child && messagesOf(child));
  }

  return tree;
}

/**
 * The messages of a result, for form libraries such as Formik: `undefined`
 * when valid, the message of a failure without children, and for an `items`
 * or `properties` failure, its errors tree with each failure replaced by its
 * messages, `null` for a valid item.
 * @param result A validator's result
 * @category Helpers
 */
export function messageTree<T, E>(
  result: Result<T, E>,
): FailureMessages<Failure<E>> | undefined;
export function messageTree(result: Result): unknown {
  return result.state === 'valid' ? undefined : messagesOf(result);
}
