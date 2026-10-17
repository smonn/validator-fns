import { createTypeValidatorTest } from './factories.js';
import type { ConfigBase } from './shared.js';

/**
 * Parses a value into a boolean.
 * @param value Value to parse
 * @category Parsers
 * @deprecated v3 removes this. In v3, use `coerce.boolean()` for text input.
 */
export function parseBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return Boolean(value);
}

/**
 * Applies a configuration to the boolean value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 * @deprecated v3 removes this, with no replacement.
 */
export function applyBooleanConfig(
  value: unknown,
  config: BooleanConfig,
): boolean | null | undefined {
  let parsedValue = config.parser(value);
  if (
    config.default !== undefined &&
    (parsedValue === undefined || parsedValue === null)
  ) {
    parsedValue = config.default;
  }

  return parsedValue;
}

/**
 * Configuration for boolean validation.
 * @category Types
 */
export type BooleanConfig = ConfigBase<boolean>;

/**
 * Validates a boolean value.
 * @category Type Validators
 */
export const boolean = createTypeValidatorTest<boolean, BooleanConfig>(
  { parser: parseBoolean },
  applyBooleanConfig,
);
