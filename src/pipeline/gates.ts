import { failure } from '../failures/index.js';
import { type Test, validResult } from '../shared.js';
import type { Runs } from './schema.js';
import { type Twin, twinOf } from './sync.js';

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
 * The twin that `array()` runs on the input before any item, for a length
 * gate, or `undefined` for any other test. Only the built-in amount tests are
 * marked, and they take any array and carry a twin.
 * @internal
 */
export function lengthGateOf<V, E>(
  test: Test<V, E>,
): Twin<unknown[]> | undefined;
export function lengthGateOf(test: Test<unknown[]>) {
  return lengthGates.has(test) ? twinOf(test) : undefined;
}

/**
 * The gate of a strict `object()`: an `unknownKeys` failure for a value with
 * own enumerable string keys that the runs don't name. A key such as
 * `constructor` or `__proto__` is unknown unless the schema has it.
 * @internal
 */
export function unknownKeys(runs: Runs): Twin<object> {
  const known = new Set(runs.map(([key]) => key));
  return (value, field) => {
    const keys = Object.keys(value).filter((key) => !known.has(key));
    return keys.length > 0
      ? failure({ code: 'unknownKeys', params: { keys }, value, field })
      : validResult({ value, field });
  };
}
