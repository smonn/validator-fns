import { isBlank, requirable } from './optional.js';
import type { TypeValidator } from './standard.js';
import {
  type ConfigBase,
  formatMessage,
  invalidResult,
  type Test,
  validResult,
  type ValidatorMessage,
  type Result,
} from './shared.js';

/**
 * Key for the synchronous twin of each test `createValidatorTest` makes. A
 * type validator runs a test's twin when it has one, which skips the promise
 * and await around every built-in test (#523). The tests themselves stay
 * async. Module-private, so only tests made here carry it.
 * @internal
 */
const syncTwin = Symbol('sync');

/** @internal */
type SyncTwin<T> = {
  // The twins never set errors, so their error type is never.
  readonly [syncTwin]?: (
    value: T,
    field: string | undefined,
  ) => Result<unknown, never>;
};

/**
 * Creates a type validator.
 * @typeParam T The basic type for the final value to be validated.
 * @typeParam C The configuration type.
 * @param defaultConfig Configuration with at least the `parser`, which
 * converts the input into the type.
 * @param applyConfig Function that applies configuration to the parsed value.
 * @category Helpers
 */
export function createTypeValidatorTest<T, C extends ConfigBase<T>>(
  // NoInfer makes TypeScript infer C from applyConfig's config parameter, so C
  // keeps the options that defaultConfig leaves out. Needs TypeScript 5.4.
  defaultConfig: NoInfer<C>,
  applyConfig: (value: T | null | undefined, config: C) => T | null | undefined,
): (
  config?: Partial<C> | Test<T, string>,
  ...tests: Test<T, string>[]
) => TypeValidator<T, string> {
  return (config, ...tests) => {
    // Typed with the twin, which only tests made here carry.
    const allTests: (Test<T, string> & SyncTwin<T>)[] =
      typeof config === 'function' ? [config, ...tests] : tests;
    const finalConfig: C = {
      ...defaultConfig,
      ...(typeof config === 'function' ? undefined : config),
    };

    return requirable<T, string>(
      finalConfig.requiredMessage,
      async (value, field, onEmpty) => {
        const parsing = finalConfig.parser(value, field);
        // Built-in parsers return a result synchronously, which skips an
        // await. Checks for `then`, as a promise from another realm isn't an
        // instance of this realm's Promise.
        const parsed = 'then' in parsing ? await parsing : parsing;
        if (parsed.state === 'invalid') {
          return invalidResult({ message: parsed.message, field });
        }

        const parsedValue = applyConfig(parsed.value, finalConfig);
        if (
          parsedValue === null ||
          parsedValue === undefined ||
          isBlank(parsedValue)
        ) {
          return onEmpty(parsedValue, field);
        }

        for (const validatorTest of allTests) {
          const syncTest = validatorTest[syncTwin];
          // Not a ternary: @vitest/coverage-v8 5 gives the branch after an
          // await in a ternary arm a negative count.
          let result: Result<unknown, string>;
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
      },
    );
  };
}

/**
 * Captures basic validator test pattern. The test gets the parsed value, and
 * fails a missing one, which type validators never pass (#660).
 * @param test Test function
 * @param message Error message
 * @param getExtras Extra parameters for the error message
 */
export function createValidatorTest<T, E = never>(
  test: (value: T, field?: string) => boolean,
  message: ValidatorMessage<T>,
): Test<T, E>;
export function createValidatorTest<T, E, X extends object>(
  test: (value: T, field?: string) => boolean,
  message: ValidatorMessage<T, X>,
  getExtras: (value: T) => X,
): Test<T, E>;
export function createValidatorTest<T, E, X extends object>(
  test: (value: T, field?: string) => boolean,
  ...format:
    | [message: ValidatorMessage<T>]
    | [message: ValidatorMessage<T, X>, getExtras: (value: T) => X]
): Test<T, E> {
  const formatFor = (value: T, field: string | undefined) =>
    format.length === 1
      ? formatMessage<T>(format[0], { value, field })
      : formatMessage(format[0], { ...format[1](value), value, field });
  const twin = (
    value: T,
    field: string | undefined,
  ): Result<unknown, never> => {
    // Wider than T, since JavaScript callers can pass a missing value.
    const given: unknown = value;
    if (given !== null && given !== undefined && test(value, field)) {
      return validResult({ value, field });
    }

    return invalidResult({ message: formatFor(value, field), field });
  };
  const validationTest: Test<T, E> = async (value, field) => twin(value, field);

  return Object.assign(validationTest, { [syncTwin]: twin });
}

/**
 * Makes a built-in parser from `read`, which converts a present value and
 * returns `undefined` for input it can't read. `undefined` and `null` stay as
 * they are, for the missing check.
 * @internal
 */
export function createParser<T>(
  read: (value: unknown) => T | undefined,
  message: string,
): (value: unknown, field?: string) => Result<T | null | undefined, never> {
  return (value, field) => {
    const parsed = value === null || value === undefined ? value : read(value);
    return parsed === undefined && value !== undefined
      ? invalidResult({ message, field })
      : validResult({ value: parsed, field });
  };
}
