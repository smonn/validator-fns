import {
  type Children,
  configAndTests,
  defineType,
  items,
  keepValue,
  lengthGateOf,
  type TypeValidator,
} from './pipeline/index.js';
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
 * A test on an array's parsed items. The built-in `min()`, `max()` and
 * `exact()` instead check the input's length before any item runs.
 * @internal
 */
type ArrayTest<T, E> = Test<T[], (Failure<E> | null)[]>;

/**
 * Builds the array validator around its children. The built-in length tests
 * are its gate, which runs on the input, and the rest run on the parsed items
 * once every item is valid.
 * @internal
 */
function arrayOf<T, E>(
  children: Children<unknown[], T[], (Failure<E> | null)[]>,
  first: Partial<ArrayConfig> | ArrayTest<T, E> | undefined,
  rest: ArrayTest<T, E>[],
): TypeValidator<T[], (Failure<E> | null)[]> {
  const { config, tests } = configAndTests(first, rest);
  return defineType({
    isType: Array.isArray,
    expected: 'array',
    default: config.default,
    messages: config.messages,
    gate: tests.flatMap((test) => lengthGateOf(test) ?? []),
    children,
    steps: tests.filter((test) => !lengthGateOf(test)),
  });
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
    return arrayOf(items(first), second, tests);
  }

  // 2.x took the config first, so a JavaScript caller may still pass the item
  // validator second, where it would be ignored.
  if (second !== undefined) {
    throw new TypeError(
      'array() takes the item validator first: array(item, config?, ...tests)',
    );
  }

  return arrayOf(keepValue, first, []);
}
