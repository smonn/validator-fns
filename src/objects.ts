import { invalid, valid, ValidatorTest } from './shared';

type ObjectParam = Record<string, ValidatorTest<unknown>>;

/**
 * Validates an object.
 * @category Type Validators
 */
export function object<P extends ObjectParam, K extends keyof P>(
  properties: P
): ValidatorTest<
  Record<K, unknown>,
  Record<K, string | Record<string, string>>
> {
  if (typeof properties !== 'object' || properties === null) {
    throw new TypeError('`properties` must be a configuration object');
  }

  return async (values, field) => {
    const keys = Object.keys(properties);

    const validationResults = await Promise.all(
      keys.map((key) => {
        const validator = properties[key];
        const value = values ? values[key as K] : undefined;
        return validator(value, key);
      })
    );

    let isValid = true;
    const value: Record<K, unknown> = {} as Record<K, unknown>;

    const errors = validationResults.reduce((acc, result) => {
      if (!result.field) {
        return acc;
      }

      isValid = isValid && result.isValid;
      value[result.field as K] = result.value;

      if (result.isValid) {
        return acc;
      }

      return {
        ...acc,
        [result.field]: result.message ? result.message : result.errors,
      };
    }, {} as Record<K, string>);

    if (isValid) {
      return valid(value, field);
    }

    return invalid('', value, field, errors);
  };
}
