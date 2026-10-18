import { createParser, typeValidatorOf } from './factories.js';
import type { ConfigBase } from './shared.js';

/**
 * Parses a value into a boolean. Fails anything but a boolean.
 * @internal
 */
const parseBoolean = createParser<boolean>('boolean');

/**
 * Configuration for boolean validation.
 * @category Types
 */
export type BooleanConfig = ConfigBase<boolean>;

/**
 * Validates a boolean value.
 * @category Type Validators
 */
export const boolean = typeValidatorOf<boolean, string>(parseBoolean);
