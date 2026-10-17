import {
  invalid,
  isIterable,
  valid,
  type ConfigBase,
  type ValidatorTest,
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
export function applyArrayConfig(
  config: ArrayConfig,
  value: unknown,
): unknown[] | null | undefined {
  let parsedValue = config.parser(value);
  if (
    config.default !== undefined &&
    (parsedValue === undefined ||
      parsedValue === null ||
      parsedValue.length === 0)
  ) {
    parsedValue = config.default;
  }

  return parsedValue;
}

/**
 * Runs the tests that target the array itself, stopping at the first failure.
 * @param tests Array-level tests
 * @param arrayValue Parsed array
 * @param field Field name
 * @internal
 */
async function findArrayInvalidResult(
  tests: ValidatorTest[],
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
 * Runs the item test on every item, collecting `null` for valid items and the
 * message or errors for invalid ones. Without an array or an item test, there
 * is nothing to check.
 * @param validateItem Item test
 * @param arrayValue Parsed array
 * @param field Field name
 * @internal
 */
async function validateItems(
  validateItem: ValidatorTest | undefined,
  arrayValue: unknown[] | null | undefined,
  field: string | undefined,
) {
  let isValid = true;
  const errors: ArrayItemValidatorResult[] = [];

  if (!arrayValue || !validateItem) {
    return { isValid, errors };
  }

  for (const [index, item] of arrayValue.entries()) {
    const result = await validateItem(
      item,
      field ? `${field}[${index}]` : `[${index}]`,
    );

    if (result.state === 'invalid') {
      isValid = false;
      errors.push(result.message || result.errors);
    } else {
      errors.push(null);
    }
  }

  return { isValid, errors };
}

/**
 * Validates an array. The first passed validator is used to validate individual
 * items. The remaining validators target the array itself.
 * @category Type Validators
 */
export function array<T, E>(
  config?: Partial<ArrayConfig> | ValidatorTest<T, E>,
  ...tests: ValidatorTest[]
): ValidatorTest<T[], string | ArrayItemValidatorResult<E>[]> {
  let allTests = tests;
  let finalConfig: ArrayConfig = {
    parser: parseArray,
  };

  if (config !== undefined) {
    if (typeof config === 'function') {
      allTests = [config, ...tests];
    } else {
      finalConfig = {
        ...finalConfig,
        ...config,
      };
    }
  }

  return async (value, field) => {
    const arrayValue = applyArrayConfig(finalConfig, value);
    const [validateItem, ...arrayTests] = allTests;

    const arrayInvalidResult = await findArrayInvalidResult(
      arrayTests,
      arrayValue,
      field,
    );
    const items = await validateItems(validateItem, arrayValue, field);

    if (!arrayInvalidResult && items.isValid) {
      return valid({
        // The items passed the item test but keep their raw values (#603).
        value: arrayValue as T[] | null | undefined,
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
