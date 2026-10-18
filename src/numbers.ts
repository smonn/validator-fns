import { createTypeValidatorTest, createValidatorTest } from './factories.js';
import { primitiveToString } from './primitives.js';
import type { ConfigBase, Test, ValidatorMessage } from './shared.js';

/**
 * Parses a value into a number.
 * @param value Value to parse
 * @internal
 */
function parseNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const text = primitiveToString(value);
  const parsed = text === undefined ? Number.NaN : Number.parseFloat(text);
  // Blank input stays empty, as NaN, for `required` and `default` to handle.
  if (Number.isNaN(parsed) && (text === undefined || text.trim() !== '')) {
    throw new TypeError('Failed to parse value to number.');
  }

  return parsed;
}

/**
 * Applies a configuration to the number value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @internal
 */
function applyNumberConfig(
  value: unknown,
  config: NumberConfig,
): number | null | undefined {
  let parsedValue = config.parser(value);
  if (
    config.default !== undefined &&
    (parsedValue === undefined ||
      parsedValue === null ||
      Number.isNaN(parsedValue))
  ) {
    parsedValue = config.default;
  }

  return parsedValue;
}

/**
 * Ensures a number value is an integer.
 * @param message Error message
 * @category Validation Tests
 */
export function integer(
  message: ValidatorMessage<number>,
): Test<number, never> {
  return createValidatorTest(
    (value: number) => Number.isFinite(value) && Math.floor(value) === value,
    message,
  );
}

/**
 * Configuration for number validation.
 * @category Types
 */
export type NumberConfig = ConfigBase<number>;

/**
 * Validates a number value.
 * @category Type Validators
 */
export const number = createTypeValidatorTest(
  {
    parser: parseNumber,
  },
  applyNumberConfig,
);
