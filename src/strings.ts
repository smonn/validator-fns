import {
  ConfigBase,
  createTypeValidatorTest,
  invalid,
  valid,
  ValidatorMessage,
  ValidatorTest,
} from './shared';

/** @internal */
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Configuration for string validation.
 * @category Types
 */
export interface StringConfig extends ConfigBase<string> {
  /** Apply trim to string before validation. */
  trim?: boolean;
}

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
  value: unknown,
  config: StringConfig
): string | null | undefined {
  let parsedValue = config.parser(value);
  if (config.default !== undefined && parsedValue === undefined) {
    parsedValue = config.default;
  }
  if (config.trim && typeof parsedValue === 'string') {
    parsedValue = parsedValue.trim();
  }
  return parsedValue;
}

/**
 * Ensures a string value matches a pattern
 * @param pattern Pattern to match
 * @param message Error message
 * @category Validation Tests
 */
export function matches(
  pattern: RegExp,
  message: ValidatorMessage<string>
): ValidatorTest<string, null> {
  return (value, field) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      pattern.test(value)
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null);
  };
}

/**
 * Ensures a string value matches an email pattern
 * @param message Error message
 * @category Validation Tests
 */
export function email(
  message: ValidatorMessage<string>
): ValidatorTest<string> {
  return matches(emailPattern, message);
}

/**
 * Ensures a string value is a valid URL
 * @param message Error message
 * @param protocols Optional list of protocols to allow
 * @category Validation Tests
 */
export function url(
  message: ValidatorMessage<string>,
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
          return invalid(message, value, field, null, { protocols });
        }

        return valid(value, field);
      }
    } catch {
      // continue despite error
    }

    return invalid(message, value, field, null, { protocols });
  };
}

/**
 * Validates a string value.
 * @category Type Validators
 */
export const string = createTypeValidatorTest(
  {
    parser: parseString,
  },
  applyStringConfig
);
