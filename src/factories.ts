import {
  type ConfigBase,
  invalid,
  valid,
  type ValidatorFactory,
  type ValidatorMessage,
  type ValidatorMessageParameters,
  type ValidatorTest,
} from './shared.js';

/**
 * Creates a type validator.
 * @typeParam T The basic type for the final value to be validated.
 * @typeParam C The configuration type.
 * @param defaultParser Parser to convert value into type.
 * @param applyConfig Function that applies configuration to value.
 * @category Helpers
 */
export function createTypeValidatorTest<T, C extends ConfigBase<T>>(
  defaultConfig: C,
  applyConfig: (value: unknown, config: C) => T | null | undefined,
): ValidatorFactory<C, T, string> {
  return (config, ...tests) => {
    let finalConfig = defaultConfig;
    let allTests = tests;

    if (config !== undefined) {
      if (typeof config === 'function') {
        allTests = [config, ...tests];
      } else {
        finalConfig = {
          ...defaultConfig,
          ...config,
        };
      }
    }

    return async (value, field) => {
      try {
        const parsedValue = applyConfig(value, finalConfig);
        for (const validatorTest of allTests) {
          const result = await validatorTest(parsedValue, field);
          if (result.state === 'invalid') {
            return result;
          }
        }

        return await valid({ value: parsedValue, field });
      } catch (error) {
        return invalid({
          message: error instanceof Error ? error.message : String(error),
          value,
          field,
        });
      }
    };
  };
}

/**
 * Captures basic validator test pattern
 * @param test Test function
 * @param message Error message
 * @param getExtras Optional extra fields for error message
 */
export function createValidatorTest<
  T = any,
  E = any,
  P extends ValidatorMessageParameters<T> = ValidatorMessageParameters<T>,
>(
  test: (value: unknown, field?: string) => boolean,
  message: ValidatorMessage<T, P>,
  getExtras?: (value: T | null | undefined) => Omit<P, 'value' | 'field'>,
): ValidatorTest<T, E> {
  return async (value, field) => {
    if (test(value, field)) {
      return valid({ value: value as T, field });
    }

    return invalid({
      message,
      value,
      field,
      extras: getExtras ? getExtras(value as T) : undefined,
    });
  };
}
