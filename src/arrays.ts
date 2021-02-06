import {
  ConfigBase,
  invalid,
  valid,
  ValidatorResult,
  ValidatorTest,
} from './shared';

/**
 * Invalid validation result for an item in the array
 * @category Types
 */
export interface ArrayItemValidatorResult {
  /** The index of the item in the original array */
  index: number;
  /** The error message if a simple type */
  message: string;
  /** The errors if an object or array */
  errors: unknown;
}

/**
 * Configuration for array validation.
 * @category Types
 */
export type ArrayConfig = ConfigBase<Array<unknown>>;

/**
 * Parses a value into an array.
 * @param value Value to parse
 * @category Parsers
 */
export function parseArray(value: unknown): Array<unknown> | null | undefined {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return value;
  return Array.from(value as Iterable<unknown>);
}

/**
 * Applies a configuration to the array value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyArrayConfig(
  config: ArrayConfig,
  value: unknown
): Array<unknown> | null | undefined {
  let parsedValue = config.parser(value);
  if (parsedValue === undefined && config.default !== undefined) {
    parsedValue = config.default;
  }
  return parsedValue;
}

/**
 * Validates an array. The first passed validator is used to validate individual
 * items. The remaining validators target the array itself.
 * @category Type Validators
 */
export function array(
  config?: Partial<ArrayConfig> | ValidatorTest,
  ...tests: ValidatorTest[]
): ValidatorTest<Array<unknown>, Array<ArrayItemValidatorResult>> {
  let allTests = tests;
  let finalConfig: ArrayConfig = {
    parser: parseArray,
  };

  if (config !== undefined) {
    if (typeof config !== 'function') {
      finalConfig = {
        ...finalConfig,
        ...config,
      };
    } else {
      allTests = [config, ...tests];
    }
  }

  return async (value, field) => {
    const arrayValue = applyArrayConfig(finalConfig, value);
    let arrayInvalidResult:
      | ValidatorResult<unknown, unknown>
      | undefined = undefined;
    let isValid = true;
    const errors: ArrayItemValidatorResult[] = [];
    const [validateItem, ...arrayTests] = allTests;

    for (let validatorTest of arrayTests) {
      const result = await validatorTest(arrayValue, field);
      if (result.state === 'invalid') {
        isValid = false;
        arrayInvalidResult = result;
        break;
      }
    }

    if (arrayValue && validateItem) {
      for (let index = 0; index < arrayValue.length; index += 1) {
        const item = arrayValue[index];
        const result = await validateItem(
          item,
          field ? `${field}[${index}]` : `[${index}]`
        );

        if (result.state === 'invalid') {
          isValid = false;
          errors.push({
            errors: result.errors,
            index,
            message: result.message,
          });
        }
      }
    }

    if (isValid) {
      return valid({
        value: arrayValue,
        field,
      });
    }

    return invalid({
      message: arrayInvalidResult ? arrayInvalidResult.message : '',
      value: arrayValue,
      field,
      errors,
    });
  };
}
