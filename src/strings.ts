import {
  createTypeValidatorTest,
  invalid,
  valid,
  ValidatorMessage,
  ValidatorTest,
} from './shared';

/** @internal */
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Parses a value into a string.
 * @param value Value to parse
 * @category Parsers
 */
export function parseString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Applies a configuration to the string value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyStringConfig(
  value: string | null | undefined,
  config: Partial<StringConfig>
): string | null | undefined {
  if (config.default !== undefined && value === undefined) {
    value = config.default;
  }
  if (config.trim && typeof value === 'string') {
    value = value.trim();
  }
  return value;
}

/**
 * Ensures a string value matches a pattern
 * @param pattern Pattern to match
 * @param message Error message
 * @category Validation Tests
 */
export function matches(
  pattern: RegExp,
  message: ValidatorMessage
): ValidatorTest<string> {
  return (value, field) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      pattern.test(value)
    ) {
      return Promise.resolve(valid(value, field));
    }

    return Promise.resolve(invalid(message, value, field));
  };
}

/**
 * Ensures a string value matches an email pattern
 * @param message Error message
 * @category Validation Tests
 */
export function email(message: ValidatorMessage): ValidatorTest<string> {
  return matches(emailPattern, message);
}

/**
 * Ensures a string value is a valid URL
 * @param message Error message
 * @param protocols Optional list of protocols to allow
 * @category Validation Tests
 */
export function url(
  message: ValidatorMessage,
  protocols?: string[]
): ValidatorTest<string> {
  return (value, field) => {
    try {
      let url: URL | undefined = undefined;
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (url = new URL(value))
      ) {
        if (url && protocols && !protocols.includes(url.protocol)) {
          return Promise.resolve(invalid(message, value, field, { protocols }));
        }

        return Promise.resolve(valid(value, field));
      }
    } catch {
      // continue despite error
    }

    return Promise.resolve(invalid(message, value, field, { protocols }));
  };
}

/**
 * Configuration for string validation.
 * @category Types
 */
export interface StringConfig {
  /** Provide a fallback value in case the original value is undefined. */
  default: string;
  /** Apply trim to string before validation */
  trim: boolean;
}

/**
 * Validates a string value.
 * @category Type Validators
 */
export const string = createTypeValidatorTest(parseString, applyStringConfig);
