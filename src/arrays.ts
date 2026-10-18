import { failure, fillAsOwn } from './failures/index.js';
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
  isIterable,
  valid,
  validResult,
  type ConfigBase,
  type Result,
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
 * Parses a value into an array: an array as it is, the items of an iterable,
 * or no items for anything else. It never fails.
 * @param value Value to parse
 * @param field Field name
 * @internal
 */
function parseArray(
  value: unknown,
  field?: string,
): Result<unknown[] | null | undefined, never> {
  if (value === null || value === undefined || Array.isArray(value)) {
    return validResult({ value, field });
  }

  return validResult({ value: isIterable(value) ? [...value] : [], field });
}

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
): TypeValidator<T[], string | ArrayItemValidatorResult<E>[]> {
  const arrayTests = typeof config === 'function' ? [config, ...tests] : tests;
  const finalConfig: ArrayConfig = {
    parser: parseArray,
    ...(typeof config === 'function' ? undefined : config),
  };

  return requirable<T[], string | ArrayItemValidatorResult<E>[]>(
    finalConfig.messages,
    async (value, field, onEmpty) => {
      const parsed = await finalConfig.parser(value, field);
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

      if (arrayInvalidResult || !items.isValid) {
        const own =
          arrayInvalidResult ??
          failure({ code: 'items', params: {}, value: arrayValue, field });
        return fillAsOwn(own, items.errors, finalConfig.messages);
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
