import { createParser } from './factories.js';
import { failure, fillAsOwn } from './failures/index.js';
import {
  type ArrayTest,
  findInvalidResult,
  keepItems,
  validateItems,
  type ValidatedItems,
} from './invalid-detail.js';
import { parsePresent, requirable } from './optional.js';
import type { TypeValidator } from './standard.js';
import {
  valid,
  type ConfigBase,
  type Failure,
  type Validator,
} from './shared.js';

/**
 * Configuration for array validation.
 * @category Types
 */
export type ArrayConfig = ConfigBase<unknown[]>;

/**
 * Parses a value into an array. Fails anything but an array.
 * @internal
 */
const parseArray = createParser('array', (value): value is unknown[] =>
  Array.isArray(value),
);

/**
 * Applies a configuration to the parsed array value.
 * @param config Configuration to apply
 * @param value Parsed value
 * @internal
 */
function applyArrayConfig(
  config: ArrayConfig,
  value: unknown[] | null | undefined,
): unknown[] | null | undefined {
  if (
    config.default !== undefined &&
    (value === undefined || value === null || value.length === 0)
  ) {
    return config.default;
  }

  return value;
}

/**
 * Builds the array validator around a function that checks the items.
 * @internal
 */
function arrayOf<T, E>(
  checkItems: (
    arrayValue: unknown[],
    field: string | undefined,
  ) => Promise<ValidatedItems<T, E>>,
  config: Partial<ArrayConfig> | ArrayTest | undefined,
  tests: ArrayTest[],
): TypeValidator<T[], (Failure<E> | null)[]> {
  const arrayTests = typeof config === 'function' ? [config, ...tests] : tests;
  const finalConfig: ArrayConfig = {
    parser: parseArray,
    ...(typeof config === 'function' ? undefined : config),
  };

  return requirable<T[], (Failure<E> | null)[]>(
    finalConfig.messages,
    async (value, field, onEmpty) => {
      const parsed = await parsePresent(finalConfig.parser, value, field);
      if (parsed.state === 'invalid') {
        return fillAsOwn<never>(parsed, undefined, finalConfig.messages);
      }

      const arrayValue = applyArrayConfig(finalConfig, parsed.value);
      if (arrayValue === null || arrayValue === undefined) {
        return onEmpty(arrayValue, field);
      }

      const arrayInvalidResult = await findInvalidResult(
        arrayTests,
        arrayValue,
        field,
      );
      const items = await checkItems(arrayValue, field);

      if (arrayInvalidResult || items.errors) {
        const own =
          arrayInvalidResult ??
          failure({ code: 'items', params: {}, value: arrayValue, field });
        // An array test's failure is a leaf, without the items' failures.
        const errors = arrayInvalidResult ? undefined : items.errors;
        return fillAsOwn(own, errors, finalConfig.messages);
      }

      return valid({ value: items.values, field });
    },
  );
}

/**
 * Validates an array. The item validator, if any, comes first and runs on each
 * item. Then an optional configuration, and tests that target the array
 * itself.
 * @category Type Validators
 */
export function array<T, E>(
  item: Validator<T, E>,
  config?: Partial<ArrayConfig> | ArrayTest,
  ...tests: ArrayTest[]
): TypeValidator<T[], (Failure<E> | null)[]>;
export function array(
  config?: Partial<ArrayConfig>,
): TypeValidator<unknown[], (Failure<unknown> | null)[]>;
export function array<T, E>(
  first?: Validator<T, E> | Partial<ArrayConfig>,
  second?: Partial<ArrayConfig> | ArrayTest,
  ...tests: ArrayTest[]
):
  | TypeValidator<T[], (Failure<E> | null)[]>
  | TypeValidator<unknown[], (Failure<unknown> | null)[]> {
  if (typeof first === 'function') {
    return arrayOf(
      (arrayValue, field) => validateItems(first, arrayValue, field),
      second,
      tests,
    );
  }

  // 2.x took the config first, so a JavaScript caller may still pass the item
  // validator second, where it would be ignored.
  if (second !== undefined) {
    throw new TypeError(
      'array() takes the item validator first: array(item, config?, ...tests)',
    );
  }

  return arrayOf(keepItems, first, []);
}
