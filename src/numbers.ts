import {
  createParser,
  createTypeValidatorTest,
  createValidatorTest,
} from './factories.js';
import { primitiveToString } from './primitives.js';
import type { ConfigBase, Test, ValidatorMessage } from './shared.js';

/**
 * Reads a number from a present value, or `undefined` if it can't.
 * @param value Value to read
 */
function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const text = primitiveToString(value);
  if (text === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(text);
  // Blank input stays empty, as NaN, for `required` and `default` to handle.
  return Number.isNaN(parsed) && text.trim() !== '' ? undefined : parsed;
}

/**
 * Parses a value into a number. Fails input with no leading number, other
 * than blank text.
 * @internal
 */
const parseNumber = createParser(
  readNumber,
  'Failed to parse value to number.',
);

/**
 * Applies a configuration to the parsed number value.
 * @param value Parsed value
 * @param config Configuration to apply
 * @internal
 */
function applyNumberConfig(
  value: number | null | undefined,
  config: NumberConfig,
): number | null | undefined {
  if (
    config.default !== undefined &&
    (value === undefined || value === null || Number.isNaN(value))
  ) {
    return config.default;
  }

  return value;
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
