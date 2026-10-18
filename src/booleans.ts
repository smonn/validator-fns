import { defineScalar } from './pipeline/index.js';
import type { ConfigBase } from './types.js';

/**
 * Configuration for boolean validation.
 * @category Types
 */
export type BooleanConfig = ConfigBase<boolean>;

/** The text `coerce.boolean()` reads, trimmed and lowercased. */
const words = new Map([
  ['true', true],
  ['1', true],
  ['on', true],
  ['false', false],
  ['0', false],
  ['off', false],
]);

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Reads `true`/`false`, `1`/`0` and `on`/`off` as text, trimmed and in any
 * case. Passes on any other input as it is.
 */
function readBoolean(input: unknown): unknown {
  return typeof input === 'string'
    ? (words.get(input.trim().toLowerCase()) ?? input)
    : input;
}

/**
 * Validates a boolean value.
 * @category Type Validators
 */
export const boolean = defineScalar('boolean', isBoolean);

/**
 * Validates a boolean value, after reading boolean text. Blank text is
 * missing.
 * @internal
 */
export const coerceBoolean = defineScalar('boolean', isBoolean, readBoolean);
