import {
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
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return parseFloat(value);
  return parseFloat(String(value));
}

/**
 * Applies a configuration to the number value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyNumberConfig(
  value: number | null | undefined,
  config: Partial<NumberConfig>
): number | null | undefined {
  if (config.default !== undefined && value === undefined) {
    value = config.default;
  }
  if (config.round && typeof value === 'number') {
    switch (config.round) {
      case 'nearest':
        value = Math.round(value);
        break;
      case 'ceil':
        value = Math.ceil(value);
        break;
      case 'floor':
        value = Math.floor(value);
        break;
    }
  }
  return value;
}

/**
 * Ensures a number value is an integer.
 * @param message Error message
 * @category Validation Tests
 */
export function integer(message: ValidatorMessage): ValidatorTest<number> {
  return (value, field) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'number' &&
        isFinite(value) &&
        Math.floor(value) === value)
    ) {
      return Promise.resolve(valid(value, field));
    }
    return Promise.resolve(invalid(message, value, field));
  };
}

/**
 * Configuration for number validation.
 * @category Types
 */
export interface NumberConfig {
  /** Provide a fallback value in case the original value is undefined. */
  default: number;
  /** Apply rounding mechanism before validation. */
  round: 'nearest' | 'floor' | 'ceil';
}

/**
 * Validates a number value.
 * @category Type Validators
 */
export const number = createTypeValidatorTest(parseNumber, applyNumberConfig);
