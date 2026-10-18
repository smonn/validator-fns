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
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}
