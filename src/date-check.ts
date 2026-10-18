/**
 * Whether a value is a date from any realm. `getTime` throws unless `this` is a
 * `Date`, which `instanceof` can't tell across realms. Primitives and arrays
 * return early so they don't pay for the throw.
 * @internal
 */
export function isDate(value: unknown): value is Date {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Array.isArray throws for a revoked Proxy.
  try {
    if (Array.isArray(value)) {
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
