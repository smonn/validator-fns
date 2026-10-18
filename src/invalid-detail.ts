import { isContainer } from './failures/index.js';
import type { Failure, Test, Validator } from './shared.js';

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
 * The error that `array()` and `object()` record for a failed item or field:
 * a container's `errors`, such as a nested object's, or else its message.
 * @param result Failed result
 * @internal
 */
export function invalidDetail<E>(result: Failure<E>): string | E {
  return isContainer(result) && result.errors !== undefined
    ? result.errors
    : result.message;
}

/**
 * A test on an array itself, such as `max()`. It runs on the parsed array,
 * before the item validator, so the items are `unknown`.
 * @internal
 */
export type ArrayTest = Test<unknown[]>;

/**
 * Each item as the item validator parsed it, and each item's error: `null` for
 * a valid item, and the message or errors for an invalid one.
 * @internal
 */
export type ValidatedItems<T, E> = {
  isValid: boolean;
  errors: (null | string | E)[];
  values: T[];
};

/**
 * Runs the item validator on every item.
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
  let isValid = true;
  const errors: (null | string | E)[] = [];
  // Only valid items' values, which are only used when every item is valid.
  const values: T[] = [];

  for (const [index, item] of arrayValue.entries()) {
    const result = await validateItem(item, `${field || ''}[${index}]`);

    if (result.state === 'invalid') {
      isValid = false;
      errors.push(invalidDetail(result));
    } else {
      values.push(result.value);
      errors.push(null);
    }
  }

  return { isValid, errors, values };
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
  return { isValid: true, errors: [], values: arrayValue };
}
