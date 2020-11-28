import {
  InvalidObjectValidatorResult,
  ObjectValidatorResults,
} from './objects';
import {
  ConfigBase,
  InvalidValidatorResult,
  ValidatorResult,
  ValidatorTest,
  ValidValidatorResult,
} from './shared';

/**
 * @category Types
 */
export interface ArrayValidator {
  (value: unknown, field?: string): Promise<ArrayValidatorResult>;
}

export interface ArrayItemValidatorResult {
  index: number;
  message: string;
  errors: ObjectValidatorResults | undefined;
}

/**
 * @category Types
 */
export type ValidArrayValidatorResult = ValidValidatorResult<unknown>;

/**
 * @category Types
 */
export interface InvalidArrayValidatorResult
  extends InvalidValidatorResult<unknown> {
  errors: ArrayItemValidatorResult[];
}

export type ArrayValidatorResult =
  | ValidArrayValidatorResult
  | InvalidArrayValidatorResult;

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
  config?: Partial<ArrayConfig> | ValidatorTest<unknown>,
  ...tests: ValidatorTest<unknown>[]
): ArrayValidator {
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
    let result: ValidatorResult<unknown> | undefined = undefined;
    let itemResults: ValidatorResult<unknown>[] = [];

    const [validateItem, ...arrayTests] = allTests;

    if (arrayTests.length > 0) {
      const results = await Promise.all(
        arrayTests.map((validatorTest) => validatorTest(arrayValue, field))
      );
      result = results.find((result) => result.isValid === false);
    }

    if (arrayValue && validateItem) {
      itemResults = await Promise.all(
        arrayValue.map((item, index) =>
          validateItem(item, field ? `${field}[${index}]` : `[${index}]`)
        )
      );
    }

    const allResults = result ? [result, ...itemResults] : itemResults;
    const firstInvalid = allResults.find((x) => x.isValid === false);
    const isValid = !firstInvalid;

    if (isValid) {
      return {
        isValid,
        value: arrayValue,
        field,
      };
    }

    return {
      isValid,
      value: arrayValue,
      field,
      message: result && !result.isValid ? result.message : '',
      errors: itemResults
        .filter((item) => !item.isValid)
        .map((item) => {
          const match = item.field && item.field.match(/\[(\d)+\]$/);
          let index = -1;
          let errors: ObjectValidatorResults | undefined = undefined;
          if (match) {
            index = parseInt(match[1], 10);
          }

          if ((item as InvalidObjectValidatorResult).errors) {
            errors = (item as InvalidObjectValidatorResult).errors;
          }

          return {
            index,
            message: item.isValid ? '' : item.message || '',
            errors,
          };
        }),
    };
  };
}
