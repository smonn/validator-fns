import { failure } from '../failures/index.js';
import { type Test, type Validator, validResult } from '../shared.js';
import type { Twin, Twinned } from './twins.js';

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
 * amount tests are marked, and they take any array and carry a twin.
 * @internal
 */
export function isLengthGate<V, E>(
  test: Test<V, E>,
): test is Test<V, E> & Twinned<unknown[]> {
  return lengthGates.has(test);
}

/**
 * The gate of a strict `object()`: an `unknownKeys` failure for a value with
 * own enumerable string keys that `schema` doesn't name. A key such as
 * `constructor` or `__proto__` is unknown unless the schema has it.
 * @internal
 */
export function unknownKeys(schema: Record<string, Validator>): Twin<object> {
  const known = new Set(Object.keys(schema));
  return (value, field) => {
    const keys = Object.keys(value).filter((key) => !known.has(key));
    return keys.length > 0
      ? failure({ code: 'unknownKeys', params: { keys }, value, field })
      : validResult({ value, field });
  };
}
