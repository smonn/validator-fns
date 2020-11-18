import { createTypeValidatorTest } from './shared';

/**
 * Parses a value into a boolean.
 * @param value Value to parse
 * @category Parsers
 */
export function parseBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === 'boolean') return value;
  return Boolean(value);
}

/**
 * Applies a configuration to the boolean value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyBooleanConfig(
  value: boolean | null | undefined,
  config: Partial<BooleanConfig>
): boolean | null | undefined {
  if (value === undefined && config.default !== undefined) {
    value = config.default;
  }
  return value;
}

/**
 * Configuration for boolean validation.
 * @category Types
 */
export interface BooleanConfig {
  /** Provide a fallback value in case the original value is undefined. */
  default: boolean;
}

/**
 * Validates a boolean value.
 * @category Type Validators
 */
export const boolean = createTypeValidatorTest(
  parseBoolean,
  applyBooleanConfig
);
