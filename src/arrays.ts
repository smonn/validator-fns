import {
  invalid,
  isIterable,
  valid,
  type ConfigBase,
  type Validator,
} from './shared.js';

/**
 * Invalid validation result for an item in the array
 * @category Types
 */
export type ArrayItemValidatorResult<E = unknown> = null | string | E;

/**
 * Configuration for array validation.
 * @category Types
 */
export type ArrayConfig = ConfigBase<unknown[]>;

/**
 * Parses a value into an array.
 * @param value Value to parse
 * @category Parsers
 */
export function parseArray(value: unknown): unknown[] | null | undefined {
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return items;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (isIterable(value)) {
    return [...value];
  }

  return [];
}

/**
 * Applies a configuration to the array value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- removing T breaks callers that pass a type argument; #588 removes it in v3
export function applyArrayConfig<T>(
  config: ArrayConfig,
  value: unknown,
): T[] | null | undefined {
  let parsedValue = config.parser(value);
  if (
    config.default !== undefined &&
    (parsedValue === undefined ||
      parsedValue === null ||
      parsedValue.length === 0)
  ) {
    parsedValue = config.default;
  }

  return parsedValue as T[];
}

/**
 * Runs the tests that target the array itself, stopping at the first failure.
 * @param tests Array-level tests
 * @param arrayValue Parsed array
 * @param field Field name
 * @internal
 */
async function findArrayInvalidResult(
  tests: Validator[],
  arrayValue: unknown[] | null | undefined,
  field: string | undefined,
) {
  for (const validatorTest of tests) {
    const result = await validatorTest(arrayValue, field);
    if (result.state === 'invalid') {
      return result;
    }
  }

  return undefined;
}

/**
 * Runs the item test on every item, collecting each item's parsed value, and
 * `null` for valid items and the message or errors for invalid ones. Without
 * an array or an item test, there is nothing to check, and the values are the
 * array as given.
 * @param validateItem Item test
 * @param arrayValue Parsed array
 * @param field Field name
 * @internal
 */
async function validateItems(
  validateItem: Validator | undefined,
  arrayValue: unknown[] | null | undefined,
  field: string | undefined,
) {
  let isValid = true;
  const errors: ArrayItemValidatorResult[] = [];

  if (!arrayValue || !validateItem) {
    return { isValid, errors, values: arrayValue };
  }

  const values: unknown[] = [];

  for (const [index, item] of arrayValue.entries()) {
    const result = await validateItem(
      item,
      field ? `${field}[${index}]` : `[${index}]`,
    );
    values.push(result.value);

    if (result.state === 'invalid') {
      isValid = false;
      errors.push(result.message || result.errors);
    } else {
      errors.push(null);
    }
  }

  return { isValid, errors, values };
}

/**
 * Validates an array. The first passed validator is used to validate individual
 * items. The remaining validators target the array itself.
 * @category Type Validators
 */
export function array<T, E>(
  config?: Partial<ArrayConfig> | Validator<T, E>,
  ...tests: Validator[]
): Validator<T[], string | ArrayItemValidatorResult<E>[]> {
  const allTests = typeof config === 'function' ? [config, ...tests] : tests;
  const finalConfig: ArrayConfig = {
    parser: parseArray,
    ...(typeof config === 'function' ? undefined : config),
  };

  return async (value, field) => {
    const arrayValue = applyArrayConfig<T>(finalConfig, value);
    const [validateItem, ...arrayTests] = allTests;

    const arrayInvalidResult = await findArrayInvalidResult(
      arrayTests,
      arrayValue,
      field,
    );
    const items = await validateItems(validateItem, arrayValue, field);

    if (!arrayInvalidResult && items.isValid) {
      return valid({
        value: items.values as T[] | null | undefined,
        field,
      });
    }

    return invalid<T[], ArrayItemValidatorResult<E>[]>({
      message: arrayInvalidResult ? arrayInvalidResult.message : '',
      value,
      field,
      errors: items.errors as ArrayItemValidatorResult<E>[],
    });
  };
}
