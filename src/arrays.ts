import { createParser, isLengthGate } from './factories.js';
import { fillOwn } from './failures/index.js';
import {
  type ItemsResult,
  keepItems,
  runTests,
  validateItems,
} from './invalid-detail.js';
import { parsePresent, requirable } from './optional.js';
import type { TypeValidator } from './standard.js';
import {
  type ConfigBase,
  type Failure,
  type Test,
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
 * A test on an array's parsed items. The built-in `min()`, `max()` and
 * `exact()` instead check the input's length before any item runs.
 * @internal
 */
type ArrayTest<T, E> = Test<T[], (Failure<E> | null)[]>;

/**
 * Builds the array validator around a function that checks the items. Runs
 * the length gates on the input, then every item, then the collection tests
 * on the parsed items once every item is valid.
 * @internal
 */
function arrayOf<T, E>(
  checkItems: (
    arrayValue: unknown[],
    field: string | undefined,
  ) => Promise<ItemsResult<T, E>>,
  config: Partial<ArrayConfig> | ArrayTest<T, E> | undefined,
  tests: ArrayTest<T, E>[],
): TypeValidator<T[], (Failure<E> | null)[]> {
  const arrayTests = typeof config === 'function' ? [config, ...tests] : tests;
  const gates: Test<unknown[], never>[] = arrayTests.filter(isLengthGate);
  const collectionTests = arrayTests.filter((test) => !isLengthGate(test));
  const finalConfig: Partial<ArrayConfig> =
    typeof config === 'function' ? {} : (config ?? {});

  return requirable<T[], (Failure<E> | null)[]>(
    finalConfig.messages,
    async (value, field, onEmpty) => {
      const parsed = await parsePresent(parseArray, value, field);
      if (parsed.state === 'invalid') {
        return fillOwn(parsed, finalConfig.messages);
      }

      const arrayValue = parsed.value ?? finalConfig.default ?? parsed.value;
      if (arrayValue === null || arrayValue === undefined) {
        return onEmpty(arrayValue, field);
      }

      const gated = await runTests(gates, arrayValue, field);
      if (gated.state === 'invalid') {
        return fillOwn(gated, finalConfig.messages);
      }

      const items = await checkItems(arrayValue, field);
      if (items.state === 'invalid') {
        return fillOwn(items, finalConfig.messages);
      }

      const result = await runTests(collectionTests, items.value, field);
      return result.state === 'invalid'
        ? fillOwn(result, finalConfig.messages)
        : result;
    },
  );
}

/**
 * Validates an array. The item validator, if any, comes first and runs on each
 * item. Then an optional configuration, and tests on the parsed items, which
 * run once every item is valid. The built-in `min()`, `max()` and `exact()`
 * check the length first, before any item runs.
 * @category Type Validators
 */
export function array<T, E>(
  item: Validator<T, E>,
  config?: Partial<ArrayConfig> | ArrayTest<NoInfer<T>, NoInfer<E>>,
  ...tests: ArrayTest<NoInfer<T>, NoInfer<E>>[]
): TypeValidator<T[], (Failure<E> | null)[]>;
export function array(
  config?: Partial<ArrayConfig>,
): TypeValidator<unknown[], (Failure<unknown> | null)[]>;
export function array<T, E>(
  first?: Validator<T, E> | Partial<ArrayConfig>,
  second?: Partial<ArrayConfig> | ArrayTest<T, E>,
  ...tests: ArrayTest<T, E>[]
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
