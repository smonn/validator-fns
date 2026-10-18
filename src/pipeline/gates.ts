import { failure } from '../failures/index.js';
import type { Test } from '../types.js';
import { validResult } from '../results.js';
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
 * The twin of a length gate, or `undefined` for any other test. Only the
 * built-in amount tests are marked, and they take any array, so typing the test
 * as one on `unknown[]` is safe, which a WeakSet's type can't express.
 * @internal
 */
function lengthGateOf<V, E>(test: Test<V, E>): Twin<unknown[]> | undefined;
function lengthGateOf(test: Test<unknown[]>) {
  return lengthGates.has(test) ? twinOf(test) : undefined;
}

/**
 * Splits `array()`'s tests into its gate, the twins of the length gates, which
 * run on the input before any item, and the steps, which run on the items.
 * @internal
 */
export function splitLengthGates<V, E>(
  tests: readonly Test<V, E>[],
): { gate: Twin<unknown[]>[]; steps: Test<V, E>[] } {
  const gate: Twin<unknown[]>[] = [];
  const steps: Test<V, E>[] = [];
  for (const test of tests) {
    const twin = lengthGateOf(test);
    if (twin) {
      gate.push(twin);
    } else {
      steps.push(test);
    }
  }
  return { gate, steps };
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
