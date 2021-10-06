import {
  ConfigBase,
  createTypeValidatorTest,
  invalid,
  valid,
  ValidatorMessage,
  ValidatorTest,
} from './shared';

/**
 * Parses a value into a number.
 * @param value Value to parse
 * @category Parsers
 */
export function parseNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  return Number.parseFloat(String(value));
}

/**
 * Applies a configuration to the number value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyNumberConfig(
  value: unknown,
  config: NumberConfig
): number | null | undefined {
  let parsedValue = config.parser(value);
  if (config.default !== undefined && parsedValue === undefined) {
    parsedValue = config.default;
  }

  if (config.round && typeof parsedValue === 'number') {
    switch (config.round) {
      case 'nearest':
        parsedValue = Math.round(parsedValue);
        break;
      case 'ceil':
        parsedValue = Math.ceil(parsedValue);
        break;
      case 'floor':
        parsedValue = Math.floor(parsedValue);
        break;
      default:
        throw new Error(`Unknown round type: ${String(config.round)}`);
    }
  }

  return parsedValue;
}

/**
 * Ensures a number value is an integer.
 * @param message Error message
 * @category Validation Tests
 */
export function integer(
  message: ValidatorMessage<number>
): ValidatorTest<number> {
  return async (value, field) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'number' &&
        Number.isFinite(value) &&
        Math.floor(value) === value)
    ) {
      return valid({ value, field });
    }

    return invalid({
      message,
      value,
      field,
    });
  };
}

/**
 * Configuration for number validation.
 * @category Types
 */
export interface NumberConfig extends ConfigBase<number> {
  /** Apply rounding mechanism before validation. */
  round?: 'nearest' | 'floor' | 'ceil';
}

/**
 * Validates a number value.
 * @category Type Validators
 */
export const number = createTypeValidatorTest(
  {
    parser: parseNumber,
  },
  applyNumberConfig
);
