import { createTypeValidatorTest, createValidatorTest } from './factories.js';
import {
  type ConfigBase,
  isObject,
  type ValidatorMessage,
  type ValidatorMessageParameters,
  type ValidatorTest,
} from './shared.js';

/** @internal */
const emailPattern =
  /^[\w!#$%&'*+./=?^`{|}~-]+@[\dA-Za-z](?:[\dA-Za-z-]{0,61}[\dA-Za-z])?(?:\.[\dA-Za-z](?:[\dA-Za-z-]{0,61}[\dA-Za-z])?)*$/;

/**
 * RFC 9562 UUIDs: versions 1 to 8 with the RFC's variant (10xx), plus the nil
 * and max UUIDs.
 * @internal
 */
const uuidPattern =
  /^(?:[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}|0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i;

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
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isObject(value)) {
    throw new TypeError('Failed to parse value to string.');
  }

  // oxlint-disable-next-line typescript/no-base-to-string -- only plain objects throw above; tests pin the coercion of other non-primitives until #579 rejects them in v3
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
  config: StringConfig,
): string | null | undefined {
  let parsedValue = config.parser(value);
  if (
    config.default !== undefined &&
    (parsedValue === undefined || parsedValue === null || parsedValue === '')
  ) {
    parsedValue = config.default;
  }

  if (config.trim && typeof parsedValue === 'string') {
    parsedValue = parsedValue.trim();
  }

  return parsedValue;
}

export interface MatchesValidatorMessageParameters extends ValidatorMessageParameters<string> {
  pattern: RegExp;
}

/**
 * Ensures a string value matches a pattern
 * @param pattern Pattern to match
 * @param message Error message
 * @category Validation Tests
 */
export function matches(
  pattern: RegExp,
  message: ValidatorMessage<string, MatchesValidatorMessageParameters>,
): ValidatorTest<string, never> {
  // A g or y pattern advances lastIndex on each test(), so a shared one would
  // fail matching values after a match. Test a private copy from index 0.
  const ownPattern = new RegExp(pattern);
  return createValidatorTest(
    (value) => {
      ownPattern.lastIndex = 0;
      return (
        value === undefined ||
        value === null ||
        value === '' ||
        (typeof value === 'string' && ownPattern.test(value))
      );
    },
    message,
    () => ({ pattern }),
  );
}

/**
 * Ensures a string value matches an email pattern
 * @param message Error message
 * @category Validation Tests
 */
export function email(
  message: ValidatorMessage<string>,
): ValidatorTest<string, never> {
  return matches(emailPattern, message);
}

/**
 * Ensures a string value is an RFC 9562 UUID, any version from 1 to 8, or the
 * nil or max UUID. Case-insensitive, without braces or a `urn:uuid:` prefix.
 * @param message Error message
 * @category Validation Tests
 */
export function uuid(
  message: ValidatorMessage<string>,
): ValidatorTest<string, never> {
  return matches(uuidPattern, message);
}

/**
 * Ensures a string value is a valid URL
 * @param message Error message
 * @param protocols Protocols to allow. Defaults to `['http:', 'https:']`; a list
 * replaces the default.
 * @category Validation Tests
 */
export function url(
  message: ValidatorMessage<string>,
  protocols: string[] = ['http:', 'https:'],
): ValidatorTest<string, never> {
  return createValidatorTest(
    (value) => {
      try {
        let parsed: URL | undefined;
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (typeof value === 'string' && (parsed = new URL(value)))
        ) {
          return !parsed || protocols.includes(parsed.protocol);
        }
      } catch {
        // Do nothing
      }

      return false;
    },
    message,
    () => ({ protocols }),
  );
}

/**
 * Validates a string value.
 * @category Type Validators
 */
export const string = createTypeValidatorTest<string, StringConfig>(
  {
    parser: parseString,
  },
  applyStringConfig,
);
