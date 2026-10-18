import {
  createParser,
  createValidatorTest,
  typeValidatorOf,
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
export const number = typeValidatorOf<number, string>(parseNumber);
