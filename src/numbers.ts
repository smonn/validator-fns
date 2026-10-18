import {
  createParser,
  createTypeValidatorTest,
  createValidatorTest,
} from './factories.js';
import type { ConfigBase, Test, ValidatorMessage } from './shared.js';

/**
 * Parses a value into a number. Fails anything but a finite number.
 * @internal
 */
const parseNumber = createParser('number', (value): value is number =>
  Number.isFinite(value),
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
  if (config.default !== undefined && (value === undefined || value === null)) {
    return config.default;
  }

  return value;
}

/**
 * Ensures a number value is an integer.
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function integer(
  message?: ValidatorMessage<number>,
): Test<number, never> {
  return createValidatorTest(
    'integer',
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
