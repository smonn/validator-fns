import {
  type ExtractError,
  type ExtractValue,
  hasOwnProperty,
  invalid,
  valid,
  type ValidatorTest,
} from './shared.js';

export type ObjectParameter = Record<string, ValidatorTest<unknown, unknown>>;

/**
 * Sets an own property. Plain assignment of `__proto__` calls the
 * `Object.prototype.__proto__` setter instead of creating the property.
 * @internal
 */
function setOwn(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

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
        // Only own properties, so a missing key named like an inherited one,
        // such as `constructor`, reads as missing.
        const value = hasOwnProperty(definedValues, key)
          ? definedValues[key]
          : undefined;
        const result = await (typeof validator === 'function'
          ? validator(value, key)
          : invalid({ field: key, message: 'No validator set', value }));

        setOwn(resolvedValues, key, result.value);

        if (result.state === 'invalid') {
          isValid = false;
          setOwn(errors, key, result.message || result.errors);
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
