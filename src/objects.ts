import { invalid, valid, ValidatorTest } from './shared';

export type ObjectParam = Record<string, ValidatorTest<any>>;

/**
 * Validates an object.
 * @category Type Validators
 */
export function object<P extends ObjectParam, K extends keyof P>(
  properties: P
): ValidatorTest<Record<K, any>, Record<K, string | Record<string, string>>> {
  if (typeof properties !== 'object' || properties === null) {
    throw new TypeError('`properties` must be a configuration object');
  }

  return async (values, field) => {
    const definedValues = values || ({} as Record<K, any>);
    const errors = {} as Record<K, string>;
    const resolvedValues: Record<K, unknown> = {} as Record<K, unknown>;
    let isValid = true;

    for (let key in properties) {
      const validator = properties[key];
      const field = (key as unknown) as K;
      const value = definedValues[field];
      const result = await validator(value, key);

      resolvedValues[field] = result.value;

      if (result.state === 'invalid') {
        isValid = false;
        errors[field] = result.message ? result.message : result.errors;
      }
    }

    if (isValid) {
      return valid({ value: resolvedValues, field });
    }

    return invalid({
      message: '',
      value: resolvedValues,
      field,
      errors,
    });
  };
}
