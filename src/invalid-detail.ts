import { childField, itemsTree } from './failures/index.js';
import type { Failure, Result, Test, Validator } from './shared.js';

/**
 * Runs tests on a value in order, stopping at the first failure, for the
 * collection-level tests of `array()` and `object()`.
 * @param tests Tests to run
 * @param value Value to test
 * @param field Field name
 * @internal
 */
export async function findInvalidResult<V, E>(
  tests: Test<V, E>[],
  value: V,
  field: string | undefined,
): Promise<Failure<E> | undefined> {
  for (const validatorTest of tests) {
    const result = await validatorTest(value, field);
    if (result.state === 'invalid') {
      return result;
    }
  }

  return undefined;
}

/**
 * A test on an array itself, such as `max()`. It runs on the parsed array,
 * before the item validator, so the items are `unknown`.
 * @internal
 */
export type ArrayTest = Test<unknown[]>;

/**
 * Each valid item as the item validator parsed it, and the array's errors
 * tree, `undefined` when every item is valid.
 * @internal
 */
export type ValidatedItems<T, E> = {
  errors: (Failure<E> | null)[] | undefined;
  values: T[];
};

/**
 * Runs the item validator on every item, with the item's full field.
 * @param validateItem Item validator
 * @param arrayValue Parsed array
 * @param field Field name
 * @internal
 */
export async function validateItems<T, E>(
  validateItem: Validator<T, E>,
  arrayValue: unknown[],
  field: string | undefined,
): Promise<ValidatedItems<T, E>> {
  const results: Result<T, E>[] = [];
  // Only valid items' values, which are only used when every item is valid.
  const values: T[] = [];

  for (const [index, item] of arrayValue.entries()) {
    const result = await validateItem(item, childField(field, index));
    results.push(result);
    if (result.state === 'valid') {
      values.push(result.value);
    }
  }

  return { errors: itemsTree(results), values };
}

/**
 * Without an item validator, there is nothing to check, and the values are the
 * array as given.
 * @param arrayValue Parsed array
 * @internal
 */
export async function keepItems(
  arrayValue: unknown[],
): Promise<ValidatedItems<unknown, unknown>> {
  return { errors: undefined, values: arrayValue };
}
