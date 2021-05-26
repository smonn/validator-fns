import {
	DeepPartial,
	ExtractError,
	ExtractValue,
	hasOwnProperty,
	invalid,
	valid,
	ValidatorTest
} from './shared';

export type ObjectParameter = Record<string, ValidatorTest<unknown, unknown>>;

/**
 * Validates an object.
 * @category Type Validators
 */
export function object<P extends ObjectParameter, K extends keyof P>(
	properties: P
): ValidatorTest<
	DeepPartial<{[K in keyof P]?: ExtractValue<P[K]>}>,
	DeepPartial<{[K in keyof P]?: ExtractError<P[K]>}>
	> {
	if (typeof properties !== 'object' || properties === null) {
		throw new TypeError('`properties` must be a configuration object');
	}

	return async (values, field) => {
		const definedValues: {[K in keyof P]?: ExtractValue<P[K]>} =
			(values as {[K in keyof P]?: ExtractValue<P[K]>}) ?? {};
		const errors: {[K in keyof P]?: ExtractError<P[K]>} = {};
		const resolvedValues: {[K in keyof P]?: ExtractValue<P[K]>} = {};
		let isValid = true;

		for (const key in properties) {
			if (hasOwnProperty(properties, key)) {
				const validator = properties[key];
				const value = definedValues[key];
				/* eslint-disable no-await-in-loop */
				const result =
					typeof validator === 'function' ?
						await validator(value, key) :
						await invalid({field: key, message: 'No validator set', value});
				/* eslint-enable no-await-in-loop */

				resolvedValues[key] = result.value as ExtractValue<P[K]>;

				if (result.state === 'invalid') {
					isValid = false;
					errors[key] = (
						result.message ? result.message : result.errors
					) as ExtractError<P[K]>;
				}
			}
		}

		if (isValid) {
			return valid({value: resolvedValues, field});
		}

		return invalid({
			message: '',
			value: values,
			field,
			errors
		});
	};
}
