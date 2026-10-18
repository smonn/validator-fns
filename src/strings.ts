import {
  createParser,
  createTypeValidatorTest,
  createValidatorTest,
} from './factories.js';
import { primitiveToString } from './primitives.js';
import {
  type ConfigBase,
  type MessageExtras,
  type ValidatorMessage,
  type ValidatorMessageParameters,
  type Test,
} from './shared.js';

/** @internal */
const emailPattern =
  /^[\w!#$%&'*+./=?^`{|}~-]+@[\dA-Za-z](?:[\dA-Za-z-]{0,61}[\dA-Za-z])?(?:\.[\dA-Za-z](?:[\dA-Za-z-]{0,61}[\dA-Za-z])?)*$/;

/** @internal */
const isEmail = (value: string) => emailPattern.test(value);

/**
 * RFC 9562 UUIDs: versions 1 to 8 with the RFC's variant (10xx), plus the nil
 * and max UUIDs.
 * @internal
 */
const uuidPattern =
  /^(?:[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}|0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i;

/** @internal */
const isUuid = (value: string) => uuidPattern.test(value);

/**
 * Configuration for string validation.
 * @category Types
 */
export interface StringConfig extends ConfigBase<string> {
  /** Apply trim to string before validation. */
  trim?: boolean;
}

/**
 * Parses a value into a string. Fails anything but a string, number, bigint,
 * boolean, valid date or an object wrapping one.
 * @internal
 */
const parseString = createParser(
  (value) =>
    value instanceof Date && !Number.isNaN(value.getTime())
      ? value.toISOString()
      : primitiveToString(value),
  'string',
);

/**
 * Applies a configuration to the parsed string value.
 * @param value Parsed value
 * @param config Configuration to apply
 * @internal
 */
function applyStringConfig(
  value: string | null | undefined,
  config: StringConfig,
): string | null | undefined {
  const parsedValue =
    config.default !== undefined &&
    (value === undefined || value === null || value === '')
      ? config.default
      : value;
  return config.trim && typeof parsedValue === 'string'
    ? parsedValue.trim()
    : parsedValue;
}

export interface MatchesValidatorMessageParameters extends ValidatorMessageParameters<string> {
  pattern: RegExp;
}

/**
 * Ensures a string value matches a pattern
 * @param pattern Pattern to match
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function matches(
  pattern: RegExp,
  message?: ValidatorMessage<
    string,
    MessageExtras<MatchesValidatorMessageParameters>
  >,
): Test<string, never> {
  // A g or y pattern advances lastIndex on each test(), so a shared one would
  // fail matching values after a match. Test a private copy from index 0.
  const ownPattern = new RegExp(pattern);
  return createValidatorTest(
    'matches',
    (value: string) => {
      ownPattern.lastIndex = 0;
      return ownPattern.test(value);
    },
    message,
    () => ({ pattern }),
  );
}

/**
 * Ensures a string value matches an email pattern
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function email(message?: ValidatorMessage<string>): Test<string, never> {
  return createValidatorTest('email', isEmail, message);
}

/**
 * Ensures a string value is an RFC 9562 UUID, any version from 1 to 8, or the
 * nil or max UUID. Case-insensitive, without braces or a `urn:uuid:` prefix.
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function uuid(message?: ValidatorMessage<string>): Test<string, never> {
  return createValidatorTest('uuid', isUuid, message);
}

/**
 * Ensures a string value is a valid URL
 * @param message Error message, or else the code
 * @param protocols Protocols to allow. Defaults to `['http:', 'https:']`; a list
 * replaces the default.
 * @category Validation Tests
 */
export function url(
  message?: ValidatorMessage<string>,
  protocols: string[] = ['http:', 'https:'],
): Test<string, never> {
  return createValidatorTest(
    'url',
    (value: string) => {
      try {
        return protocols.includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    message,
    () => ({ protocols }),
  );
}

/**
 * Validates a string value.
 * @category Type Validators
 */
export const string = createTypeValidatorTest(
  {
    parser: parseString,
  },
  applyStringConfig,
);
