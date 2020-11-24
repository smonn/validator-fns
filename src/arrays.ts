import { ValidatorResult, ValidatorTest } from './shared';

/**
 * @category Types
 */
export interface ArrayValidator {
  (value: unknown, field?: string): Promise<ArrayValidatorResult>;
}

/**
 * @category Types
 */
export interface ArrayValidatorResult extends ValidatorResult<unknown> {
  result?: ValidatorResult<unknown>;
  itemResults: ValidatorResult<unknown>[];
}

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
  value: Array<unknown> | null | undefined,
  config: Partial<ArrayConfig>
): Array<unknown> | null | undefined {
  if (value === undefined && config.default !== undefined) {
    value = config.default;
  }
  return value;
}

/**
 * Configuration for array validation.
 * @category Types
 */
export interface ArrayConfig {
  /** Provide a fallback value in case the original value is undefined. */
  default: Array<unknown>;
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
  return async (value, field) => {
    let arrayValue = parseArray(value);
    let allTests = tests;
    let result: ValidatorResult<unknown> | undefined = undefined;
    let itemResults: ValidatorResult<unknown>[] = [];

    if (config !== undefined) {
      if (typeof config !== 'function') {
        arrayValue = applyArrayConfig(arrayValue, config);
      } else {
        allTests = [config, ...tests];
      }
    }

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

    return {
      isValid,
      value: arrayValue,
      field,
      result,
      itemResults,
    };
  };
}
