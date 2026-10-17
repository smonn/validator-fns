import {
  type ConfigBase,
  invalid,
  invalidResult,
  validResult,
  type ValidatorFactory,
  type ValidatorMessage,
  type ValidatorMessageParameters,
  type ValidatorResult,
  type ValidatorTest,
} from './shared.js';

/**
 * Synchronous twins of the tests `createValidatorTest` makes. A type validator
 * runs a test's twin when it has one, which skips the promise and await around
 * every built-in test (#523). The tests themselves stay async.
 * @internal
 */
const syncTests = new WeakMap<
  ValidatorTest,
  // The twins never set errors, so their error type is never.
  (value: unknown, field: string | undefined) => ValidatorResult<unknown, never>
>();

/**
 * Creates a type validator.
 * @typeParam T The basic type for the final value to be validated.
 * @typeParam C The configuration type.
 * @param defaultParser Parser to convert value into type.
 * @param applyConfig Function that applies configuration to value.
 * @category Helpers
 */
export function createTypeValidatorTest<T, C extends ConfigBase<T>>(
  // NoInfer makes TypeScript infer C from applyConfig's config parameter, so C
  // keeps the options that defaultConfig leaves out. Needs TypeScript 5.4.
  defaultConfig: NoInfer<C>,
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
          const syncTest = syncTests.get(validatorTest);
          // Not a ternary: @vitest/coverage-v8 5 gives the branch after an
          // await in a ternary arm a negative count.
          let result: ValidatorResult<unknown, string>;
          if (syncTest) {
            result = syncTest(parsedValue, field);
          } else {
            result = await validatorTest(parsedValue, field);
          }
          if (result.state === 'invalid') {
            return result;
          }
        }

        return validResult({ value: parsedValue, field });
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
  T = unknown,
  E = never,
  P extends ValidatorMessageParameters<T> = ValidatorMessageParameters<T>,
>(
  test: (value: unknown, field?: string) => boolean,
  message: ValidatorMessage<T, P>,
  getExtras?: (value: T | null | undefined) => Omit<P, 'value' | 'field'>,
): ValidatorTest<T, E> {
  const syncTest = (
    value: unknown,
    field: string | undefined,
  ): ValidatorResult<T, never> => {
    if (test(value, field)) {
      return validResult({ value: value as T, field });
    }

    return invalidResult({
      message,
      value,
      field,
      extras: getExtras ? getExtras(value as T) : undefined,
    });
  };
  const validatorTest: ValidatorTest<T, E> = async (value, field) =>
    syncTest(value, field);
  syncTests.set(validatorTest, syncTest);

  return validatorTest;
}
