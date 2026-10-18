import { setOwn, type ValidatorMessageParameters } from '../types.js';

/**
 * The value of an object's own data property, or `undefined` for anything
 * else: a target that isn't an object, a missing or inherited key, a getter,
 * which it doesn't run, or a target such as a revoked Proxy, whose trap
 * throws.
 * @internal
 */
export function ownData(target: unknown, key: PropertyKey): unknown {
  if (typeof target !== 'object' || target === null) {
    return undefined;
  }

  try {
    return Object.getOwnPropertyDescriptor(target, key)?.value;
  } catch {
    return undefined;
  }
}

/**
 * A target's own enumerable data properties as entries, symbol keys included,
 * as spread copies them, read without running a getter. A trap that throws,
 * as a revoked Proxy's does, ends the list there.
 * @internal
 */
function dataOf(target: object): [PropertyKey, unknown][] {
  const data: [PropertyKey, unknown][] = [];
  try {
    for (const key of Reflect.ownKeys(target)) {
      // A Proxy can list a key it has no descriptor for, which spread skips.
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      if (descriptor?.enumerable && 'value' in descriptor) {
        data.push([key, descriptor.value]);
      }
    }
  } catch {
    // The entries read before the throw stay.
  }
  return data;
}

/**
 * The parameters a message gets: `params` spread, then `value` and `field`.
 * Copying never throws: when spreading does, on a getter that throws or a
 * revoked Proxy, the copy holds only the own enumerable data properties it
 * can read, without running a getter.
 *
 * The overload is an unchecked assertion for that fallback, which can lack
 * the keys whose getters throw. TypeScript can't type a copy built key by key
 * as `P`, and a message reading such a key gets `undefined`, as for any key
 * the params lack.
 * @internal
 */
export function parametersOf<P extends Record<string, unknown>, T>(
  params: P,
  value: T | null | undefined,
  field: string | undefined,
): P & ValidatorMessageParameters<T>;
export function parametersOf(
  params: object,
  value: unknown,
  field: string | undefined,
): Record<string, unknown> {
  try {
    return { ...params, value, field };
  } catch {
    const parameters = {};
    for (const [key, data] of dataOf(params)) {
      setOwn(parameters, key, data);
    }
    return { ...parameters, value, field };
  }
}
