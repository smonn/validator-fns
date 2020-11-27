import { ValidatorResult, ValidatorTest } from './shared';

/**
 * @category Types
 */
export interface ObjectValidator {
  (values: unknown, field?: string): Promise<ObjectValidatorResult>;
}

/**
 * @category Types
 */
export interface ObjectValidatorTests {
  [field: string]: ValidatorTest<unknown>;
}

/**
 * @category Types
 */
export interface ObjectValidatorValues {
  [field: string]: unknown;
}

/**
 * @category Types
 */
export interface ObjectValidatorResults {
  [field: string]: ValidatorResult<unknown>;
}

/**
 * @category Types
 */
export interface ObjectValidatorResult
  extends ValidatorResult<Record<string, unknown>> {
  results: ObjectValidatorResults;
}

/**
 * Validates an object.
 * @category Type Validators
 */
export function object(properties: ObjectValidatorTests): ObjectValidator {
  if (
    typeof properties !== 'object' ||
    properties === null ||
    Object.keys(properties).length === 0
  ) {
    throw new TypeError('`properties` must be a configuration object');
  }

  return async (values, field) => {
    const keys = Object.keys(properties);

    const validationResults = await Promise.all(
      keys.map((key) => {
        const validator = properties[key];
        const value = values
          ? (values as ObjectValidatorValues)[key]
          : undefined;
        return validator(value, key);
      })
    );

    let isValid = true;
    const value: Record<string, unknown> = {};

    const results = validationResults.reduce((acc, result) => {
      if (!result.field) {
        return acc;
      }

      isValid = isValid && result.isValid;
      value[result.field] = result.value;

      return {
        ...acc,
        [result.field]: result,
      };
    }, {});

    return { results, isValid, field, value };
  };
}
