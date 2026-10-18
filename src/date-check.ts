/**
 * Whether a value is a date from any realm. `getTime` throws unless `this` is a
 * `Date`, which `instanceof` can't tell across realms. Primitives, arrays and
 * plain objects return early so they don't pay for the throw, which means a
 * real date given `Object.prototype` or a `null` prototype doesn't count.
 * @internal
 */
export function isDate(value: unknown): value is Date {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Array.isArray and Object.getPrototypeOf throw for a revoked Proxy.
  try {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (
      Array.isArray(value) ||
      prototype === Object.prototype ||
      prototype === null
    ) {
      return false;
    }

    Date.prototype.getTime.call(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * The time of a date, which the date's own `getTime` or `valueOf` can't change.
 * @internal
 */
export function timeOf(date: Date): number {
  return Date.prototype.getTime.call(date);
}
