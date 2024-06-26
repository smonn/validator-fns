import {
  invalid,
  valid,
  type ConfigBase,
  type ValidatorResult,
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
    return value as unknown[];
  }

  if (value === null || value === undefined) {
    return value;
  }

  const iterable = value as Iterable<unknown>;

  if (iterable[Symbol.iterator]) {
    return [...iterable];
  }

  return [];
}

/**
 * Applies a configuration to the array value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
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
    const arrayValue = applyArrayConfig<T>(finalConfig, value);
    let arrayInvalidResult: ValidatorResult | undefined;
    let isValid = true;
    const errors: ArrayItemValidatorResult[] = [];
    const [validateItem, ...arrayTests] = allTests;

    for (const validatorTest of arrayTests) {
      const result = await validatorTest(arrayValue, field);
      if (result.state === 'invalid') {
        isValid = false;
        arrayInvalidResult = result;
        break;
      }
    }

    if (arrayValue && validateItem) {
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
    }

    if (isValid) {
      return valid({
        value: arrayValue,
        field,
      });
    }

    return invalid<T[], ArrayItemValidatorResult<E>[]>({
      message:
        arrayInvalidResult?.state === 'invalid'
          ? arrayInvalidResult.message
          : '',
      value,
      field,
      errors: errors as ArrayItemValidatorResult<E>[],
    });
  };
}
