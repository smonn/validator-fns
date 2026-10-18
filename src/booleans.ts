import { createTypeValidatorTest } from './factories.js';
import { type ConfigBase, type Result, validResult } from './shared.js';

/**
 * Parses a value into a boolean. It never fails.
 * @param value Value to parse
 * @param field Field name
 * @internal
 */
function parseBoolean(
  value: unknown,
  field?: string,
): Result<boolean | null | undefined, never> {
  return validResult({
    value: value === undefined || value === null ? value : Boolean(value),
    field,
  });
}

/**
 * Applies a configuration to the parsed boolean value.
 * @param value Parsed value
 * @param config Configuration to apply
 * @internal
 */
function applyBooleanConfig(
  value: boolean | null | undefined,
  config: BooleanConfig,
): boolean | null | undefined {
  if (config.default !== undefined && (value === undefined || value === null)) {
    return config.default;
  }

  return value;
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
export const boolean = createTypeValidatorTest(
  { parser: parseBoolean },
  applyBooleanConfig,
);
