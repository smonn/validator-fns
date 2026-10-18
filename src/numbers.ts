import { createValidatorTest, defineScalar } from './pipeline/index.js';
import type { ConfigBase, Test, ValidatorMessage } from './shared.js';

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

function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

/**
 * Whole decimal text: an optional sign, digits, and an optional fraction and
 * exponent.
 */
const decimal = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * Reads trimmed decimal text as a number. Passes on any other input, and text
 * past a finite number, such as `'1e400'`, as it is.
 */
function readNumber(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  const text = input.trim();
  const read = decimal.test(text) ? Number(text) : Number.NaN;
  return Number.isFinite(read) ? read : input;
}

/**
 * Validates a number value. Fails anything but a finite number.
 * @category Type Validators
 */
export const number = defineScalar('number', isFiniteNumber);

/**
 * Validates a number value, after reading decimal text as a number. Blank text
 * is missing.
 * @internal
 */
export const coerceNumber = defineScalar('number', isFiniteNumber, readNumber);
