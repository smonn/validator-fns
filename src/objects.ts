import {
  InvalidValidatorResult,
  ValidatorTest,
  ValidValidatorResult,
} from './shared';

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
  [field: string]: string;
}

/**
 * @category Types
 */
export type ValidObjectValidatorResult = ValidValidatorResult<
  Record<string, unknown>
>;

/**
 * @category Types
 */
export interface InvalidObjectValidatorResult
  extends InvalidValidatorResult<Record<string, unknown>> {
  errors: ObjectValidatorResults;
}

/**
 * @category Types
 */
export type ObjectValidatorResult =
  | ValidObjectValidatorResult
  | InvalidObjectValidatorResult;

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

    const errors = validationResults.reduce((acc, result) => {
      if (!result.field) {
        return acc;
      }

      isValid = isValid && result.isValid;
      value[result.field] = result.value;

      if (result.isValid) {
        return acc;
      }

      return {
        ...acc,
        [result.field]: result.message,
      };
    }, {});

    return { errors, isValid, field, value };
  };
}
