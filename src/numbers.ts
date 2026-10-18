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

/**
 * Validates a number value. Fails anything but a finite number.
 * @category Type Validators
 */
export const number = defineScalar('number', (value): value is number =>
  Number.isFinite(value),
);
