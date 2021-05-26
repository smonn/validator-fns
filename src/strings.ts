import {
	ConfigBase,
	createTypeValidatorTest,
	createValidatorTest,
	isObject,
	ValidatorMessage,
	ValidatorMessageParameters,
	ValidatorTest
} from './shared.js';

/** @internal */
const emailPattern =
	/^[\w.!#$%&'*+/=?^`{|}~-]+@[a-zA-Z\d](?:[a-zA-Z\d-]{0,61}[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]{0,61}[a-zA-Z\d])?)*$/;

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

export interface MatchesValidatorMessageParameters
	extends ValidatorMessageParameters<string> {
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
	message: ValidatorMessage<string, MatchesValidatorMessageParameters>
): ValidatorTest<string> {
	return createValidatorTest(
		value =>
			value === undefined ||
			value === null ||
			value === '' ||
			(typeof value === 'string' && pattern.test(value)),
		message,
		() => ({pattern})
	);
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
	return createValidatorTest(
		value => {
			try {
				let url: URL | undefined;
				if (
					value === undefined ||
					value === null ||
					value === '' ||
					(typeof value === 'string' && (url = new URL(value)))
				) {
					return !(url && protocols && !protocols.includes(url.protocol));
				}
			} catch {
				// Do nothing
			}

			return false;
		},
		message,
		() => ({protocols})
	);
}

/**
 * Validates a string value.
 * @category Type Validators
 */
export const string = createTypeValidatorTest(
	{
		parser: parseString
	},
	applyStringConfig
);
