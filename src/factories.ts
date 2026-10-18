import { failure, fillOwn } from './failures/index.js';
import { type Parser, parsePresent, requirable } from './optional.js';
import type { TypeValidator } from './standard.js';
import {
  type ConfigBase,
  type Test,
  validResult,
  type Validator,
  type ValidatorMessage,
  type Result,
} from './shared.js';

// Lives in optional.ts so object()'s parser can be built there. Re-exported
// until #758 deletes this file.
export { createParser } from './optional.js';

/**
 * Key for the synchronous twin of each test `withSyncTwin` makes. A type
 * validator runs a test's twin when it has one, which skips the promise and
 * await around every built-in test (#523). The tests themselves stay async.
 * Module-private, so only tests made here carry it.
 * @internal
 */
const syncTwin = Symbol('sync');

/**
 * A test's synchronous twin. The twins never set errors, so their error type
 * is never.
 * @internal
 */
type Twin<T> = (value: T, field: string | undefined) => Result<T, never>;

/**
 * Makes the factory of a type validator that reads input with `parser`.
 * @internal
 */
export function typeValidatorOf<T, E>(
  parser: Parser<T, E>,
): (
  config?: Partial<ConfigBase<T>> | Test<T, E>,
  ...tests: Test<T, E>[]
) => TypeValidator<T, E> {
  return (config, ...tests) => {
    // Typed with the twin, which only tests made here carry.
    const allTests: (Test<T, E> & { [syncTwin]?: Twin<T> })[] =
      typeof config === 'function' ? [config, ...tests] : tests;
    const finalConfig = typeof config === 'function' ? {} : (config ?? {});

    return requirable<T, E>(
      finalConfig.messages,
      async (value, field, onEmpty) => {
        const parsing = parsePresent(parser, value, field);
        // Built-in parsers return a result synchronously, which skips an
        // await. Checks for `then`, as a promise from another realm isn't an
        // instance of this realm's Promise.
        const parsed = 'then' in parsing ? await parsing : parsing;
        if (parsed.state === 'invalid') {
          return fillOwn(parsed, finalConfig.messages);
        }

        let parsedValue = parsed.value ?? finalConfig.default ?? parsed.value;
        if (parsedValue === null || parsedValue === undefined) {
          return onEmpty(parsedValue, field);
        }

        for (const validatorTest of allTests) {
          const syncTest = validatorTest[syncTwin];
          // Not a ternary: @vitest/coverage-v8 5 gives the branch after an
          // await in a ternary arm a negative count.
          let result: Result<T, E>;
          if (syncTest) {
            result = syncTest(parsedValue, field);
          } else {
            result = await validatorTest(parsedValue, field);
          }
          if (result.state === 'invalid') {
            return fillOwn(result, finalConfig.messages);
          }
          parsedValue = result.value;
        }

        return validResult({ value: parsedValue, field });
      },
    );
  };
}

/**
 * Makes a custom type validator from a parser, which can be any validator. It
 * reads present input, and its failure is the type validator's own, with its
 * code, params and errors. The type validator adds the missing check,
 * `default`, `messages`, the tests and `optional()`.
 * @param parser Validator that reads the input into the type
 * @category Helpers
 */
export function createTypeValidator<T, E>(
  parser: Validator<T | null | undefined, E>,
): (
  config?: Partial<ConfigBase<T>> | Test<T, E>,
  ...tests: Test<T, E>[]
) => TypeValidator<T, E> {
  return typeValidatorOf(parser);
}

/**
 * Captures basic validator test pattern. The test gets the parsed value, and
 * fails a missing one, which type validators never pass (#660). A failure has
 * `code`, the params from `getParams`, and `message` or else the code.
 * @param code What failed, such as `min`
 * @param test Test function
 * @param message Error message
 * @param getParams The code's parameters, also given to the message
 */
export function createValidatorTest<T, E = never>(
  code: string,
  test: (value: T, field?: string) => boolean,
  message?: ValidatorMessage<T>,
): Test<T, E>;
export function createValidatorTest<T, E, P extends Record<string, unknown>>(
  code: string,
  test: (value: T, field?: string) => boolean,
  message: ValidatorMessage<T, P> | undefined,
  getParams: (value: T) => P,
): Test<T, E>;
export function createValidatorTest<T, E>(
  code: string,
  test: (value: T, field?: string) => boolean,
  message?: ValidatorMessage<T, Record<string, unknown>>,
  getParams?: (value: T) => Record<string, unknown>,
): Test<T, E> {
  return withSyncTwin((value: T, field) => {
    // Wider than T, since JavaScript callers can pass a missing value.
    const given: unknown = value;
    if (given !== null && given !== undefined && test(value, field)) {
      return validResult({ value, field });
    }

    const params = getParams ? getParams(value) : {};
    return failure({ code, params, message, value, field });
  });
}

/**
 * The built-in `min()`, `max()` and `exact()` tests, which `array()` runs on
 * the input before any item. A wrapped one isn't in it, so it runs after the
 * items.
 * @internal
 */
const lengthGates = new WeakSet<object>();

/**
 * Marks a built-in amount test as a length gate for `array()`.
 * @internal
 */
export function asLengthGate<T>(test: Test<T, never>): Test<T, never> {
  lengthGates.add(test);
  return test;
}

/**
 * Whether `array()` runs test on the input before any item. Only the built-in
 * amount tests are marked, and they take any array.
 * @internal
 */
export function isLengthGate<V, E>(
  test: Test<V, E>,
): test is Test<V, E> & Test<unknown[], never> {
  return lengthGates.has(test);
}

/**
 * Makes a test from its synchronous twin, which type validators run in its
 * place.
 * @internal
 */
export function withSyncTwin<T, E>(twin: Twin<T>): Test<T, E> {
  const validationTest: Test<T, E> = async (value, field) => twin(value, field);
  return Object.assign(validationTest, { [syncTwin]: twin });
}
