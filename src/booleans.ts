import { createParser, createTypeValidatorTest } from './factories.js';
import type { ConfigBase } from './shared.js';

/**
 * Parses a value into a boolean. Fails anything but a boolean.
 * @internal
 */
const parseBoolean = createParser<boolean>('boolean');

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
