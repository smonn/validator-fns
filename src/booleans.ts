import { defineScalar } from './pipeline/index.js';
import type { ConfigBase } from './shared.js';

/**
 * Configuration for boolean validation.
 * @category Types
 */
export type BooleanConfig = ConfigBase<boolean>;

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Validates a boolean value.
 * @category Type Validators
 */
export const boolean = defineScalar('boolean', isBoolean);
