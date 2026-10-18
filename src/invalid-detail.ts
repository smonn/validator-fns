import { childField, itemsTree } from './failures/index.js';
import {
  type Failure,
  type Result,
  type Test,
  type Validator,
  validResult,
} from './shared.js';

/**
 * Runs tests on a value in order, for the collection-level tests of
 * `object()`. Each test's valid value goes to the next, and the first failure
 * ends the run.
 * @param tests Tests to run
 * @param value Value to test
 * @param field Field name
 * @internal
 */
export async function runTests<V, E>(
  tests: Test<V, E>[],
  value: V,
  field: string | undefined,
): Promise<Result<V, E>> {
  let current = value;
  for (const validatorTest of tests) {
    const result = await validatorTest(current, field);
    if (result.state === 'invalid') {
      return result;
    }
    current = result.value;
  }

  return validResult({ value: current, field });
}

/**
 * The first failure of `array()`'s collection-level tests, which don't pass
 * values on yet (#757).
 * @internal
 */
export async function findInvalidResult<V, E>(
  tests: Test<V, E>[],
  value: V,
  field: string | undefined,
): Promise<Failure<E> | undefined> {
  const result = await runTests(tests, value, field);
  return result.state === 'invalid' ? result : undefined;
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
