import {
  childField,
  failure,
  itemsTree,
  propertiesTree,
} from './failures/index.js';
import {
  type Failure,
  type Result,
  setOwn,
  type Test,
  type Validator,
  validResult,
} from './shared.js';

/**
 * Runs tests on a value in order, for the collection tests of `array()` and
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
 * The result of an array's items: valid with each item as the item validator
 * parsed it, or an `items` failure whose errors tree holds each item's.
 * @internal
 */
export type ItemsResult<T, E> = Result<T[], (Failure<E> | null)[]>;

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
): Promise<ItemsResult<T, E>> {
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

  const errors = itemsTree(results);
  return errors
    ? failure({ code: 'items', params: {}, value: arrayValue, field, errors })
    : validResult({ value: values, field });
}

/**
 * Without an item validator, there is nothing to check, and the values are the
 * array as given.
 * @param arrayValue Parsed array
 * @param field Field name
 * @internal
 */
export async function keepItems(
  arrayValue: unknown[],
  field: string | undefined,
): Promise<ItemsResult<unknown, unknown>> {
  return validResult({ value: arrayValue, field });
}

/**
 * Makes the gate of a strict `object()`: an `unknownKeys` failure for a value
 * with own enumerable keys that its properties don't name. A key such as
 * `constructor` or `__proto__` is unknown unless the schema has it. Without
 * `strict`, every value passes.
 * @internal
 */
export function unknownKeysGate(
  validators: [key: string, validator: Validator][],
  strict: boolean | undefined,
): (
  objectValue: object,
  value: unknown,
  field: string | undefined,
) => Failure<never> | undefined {
  const known = new Set(validators.map(([key]) => key));
  return (objectValue, value, field) => {
    const keys = strict
      ? Object.keys(objectValue).filter((key) => !known.has(key))
      : [];
    return keys.length > 0
      ? failure({ code: 'unknownKeys', params: { keys }, value, field })
      : undefined;
  };
}

/**
 * Runs each property's validator on the value `read` gives for its key, with
 * the key's full field. Gives the errors tree, each failed property's failure
 * set on `tree`, or `undefined` when every property is valid, and each valid
 * property's value.
 * @internal
 */
export async function validateProperties<Tree extends object>(
  validators: [key: string, validator: Validator][],
  read: (key: string) => unknown,
  field: string | undefined,
  tree: Tree,
): Promise<{ errors: Tree | undefined; values: Record<string, unknown> }> {
  const results: [key: string, result: Result][] = [];
  const values: Record<string, unknown> = {};

  for (const [key, validator] of validators) {
    const result = await validator(read(key), childField(field, key));
    results.push([key, result]);
    if (result.state === 'valid') {
      setOwn(values, key, result.value);
    }
  }

  return { errors: propertiesTree(results, tree), values };
}
