import { defineScalar } from './pipeline/index.js';
import type { ConfigBase } from './shared.js';

/**
 * Configuration for boolean validation.
 * @category Types
 */
export type BooleanConfig = ConfigBase<boolean>;

/**
 * Validates a boolean value.
 * @category Type Validators
 */
export const boolean = defineScalar<boolean>('boolean');
