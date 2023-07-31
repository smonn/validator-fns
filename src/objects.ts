import {
  ExtractError,
  ExtractValue,
  hasOwnProperty,
  invalid,
  valid,
  ValidatorTest,
} from './shared';

export type ObjectParameter = Record<string, ValidatorTest<unknown, unknown>>;

/**
 * Validates an object.
 * @category Type Validators
 */
export function object<
  P extends ObjectParameter,
  V extends { [K in keyof P]?: ExtractValue<P[K]> },
  E extends { [K in keyof P]?: ExtractError<P[K]> },
>(properties: P): ValidatorTest<V, E> {
  if (typeof properties !== 'object' || properties === null) {
    throw new TypeError('`properties` must be a configuration object');
  }

  return async (values, field) => {
    const definedValues = (values ?? {}) as V;
    const errors = {} as E;
    const resolvedValues = {} as V;
    let isValid = true;

    for (const key in properties) {
      if (hasOwnProperty(properties, key)) {
        const validator = properties[key];
        const value = definedValues[key];
        /* eslint-disable no-await-in-loop */
        const result =
          typeof validator === 'function'
            ? await validator(value, key)
            : await invalid({ field: key, message: 'No validator set', value });
        /* eslint-enable no-await-in-loop */

        resolvedValues[key] = result.value as V[Extract<keyof P, string>];

        if (result.state === 'invalid') {
          isValid = false;
          errors[key] = (result.message || result.errors) as E[Extract<
            keyof P,
            string
          >];
        }
      }
    }

    if (isValid) {
      return valid({ value: resolvedValues, field });
    }

    return invalid({
      message: '',
      value: values,
      field,
      errors,
    });
  };
}
