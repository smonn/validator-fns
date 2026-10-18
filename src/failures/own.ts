import { setOwn, type ValidatorMessageParameters } from '../shared.js';

/**
 * The value of an own data property, or `undefined` for anything else: a
 * missing or inherited key, a getter, which it doesn't run, or a target such
 * as a revoked Proxy, whose trap throws.
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
 * A target's own property descriptors, or none for a target such as a revoked
 * Proxy, whose trap throws.
 * @internal
 */
function descriptorsOf(target: object): Record<string, PropertyDescriptor> {
  try {
    return Object.getOwnPropertyDescriptors(target);
  } catch {
    return {};
  }
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
    const parameters: Record<string, unknown> = {};
    const descriptors = descriptorsOf(params);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor.enumerable && 'value' in descriptor) {
        setOwn(parameters, key, descriptor.value);
      }
    }
    return { ...parameters, value, field };
  }
}
