import {
  type ArrayTest,
  findInvalidResult,
  keepItems,
  validateItems,
  type ValidatedItems,
} from './invalid-detail.js';
import { requirable } from './optional.js';
import type { TypeValidator } from './standard.js';
import {
  invalidResult,
  isIterable,
  valid,
  type ConfigBase,
  type Validator,
} from './shared.js';

/**
 * Invalid validation result for an item in the array
 * @category Types
 */
export type ArrayItemValidatorResult<E = unknown> = null | string | E;

/**
 * Configuration for array validation.
 * @category Types
 */
export type ArrayConfig = ConfigBase<unknown[]>;

/**
 * Parses a value into an array.
 * @param value Value to parse
 * @category Parsers
 */
export function parseArray(value: unknown): unknown[] | null | undefined {
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return items;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (isIterable(value)) {
    return [...value];
  }

  return [];
}

/**
 * Applies a configuration to the array value.
 * @param value Value to modify
 * @param config Configuration to apply
 * @category Helpers
 */
export function applyArrayConfig(
  config: ArrayConfig,
  value: unknown,
): unknown[] | null | undefined {
  let parsedValue = config.parser(value);
  if (
    config.default !== undefined &&
    (parsedValue === undefined ||
      parsedValue === null ||
      parsedValue.length === 0)
  ) {
    parsedValue = config.default;
  }

  return parsedValue;
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
): TypeValidator<T[], string | ArrayItemValidatorResult<E>[]> {
  const arrayTests = typeof config === 'function' ? [config, ...tests] : tests;
  const finalConfig: ArrayConfig = {
    parser: parseArray,
    ...(typeof config === 'function' ? undefined : config),
  };

  return requirable<T[], string | ArrayItemValidatorResult<E>[]>(
    finalConfig.requiredMessage,
    async (value, field, onEmpty) => {
      const arrayValue = applyArrayConfig(finalConfig, value);
      if (arrayValue === null || arrayValue === undefined) {
        return onEmpty(arrayValue, field);
      }

      const arrayInvalidResult = await findInvalidResult(
        arrayTests,
        arrayValue,
        field,
      );
      const items = await checkItems(arrayValue, field);

      if (!arrayInvalidResult && items.isValid) {
        return valid({ value: items.values, field });
      }

      return invalidResult({
        message: arrayInvalidResult ? arrayInvalidResult.message : '',
        field,
        errors: items.errors,
      });
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
): TypeValidator<T[], string | ArrayItemValidatorResult<E>[]>;
export function array(
  config?: Partial<ArrayConfig>,
): TypeValidator<unknown[], string | ArrayItemValidatorResult[]>;
export function array<T, E>(
  first?: Validator<T, E> | Partial<ArrayConfig>,
  second?: Partial<ArrayConfig> | ArrayTest,
  ...tests: ArrayTest[]
):
  | TypeValidator<T[], string | ArrayItemValidatorResult<E>[]>
  | TypeValidator<unknown[], string | ArrayItemValidatorResult[]> {
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
