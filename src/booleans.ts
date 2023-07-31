import { ConfigBase, createTypeValidatorTest } from './shared';

/**
 * Parses a value into a boolean.
 * @param value Value to parse
 * @category Parsers
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
export const boolean = createTypeValidatorTest(
  { parser: parseBoolean },
  applyBooleanConfig,
);
