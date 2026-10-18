/**
 * The time of a date from any realm, or `NaN` for any other value. `getTime`
 * throws unless `this` is a `Date`, which `instanceof` can't tell across
 * realms, and unlike `valueOf` the value can't override it.
 */
export function timeOf(value: unknown): number {
  try {
    return Date.prototype.getTime.call(value);
  } catch {
    return Number.NaN;
  }
}

/** Whether a value is a valid date, from any realm. */
export function isValidDate(value: unknown): value is Date {
  return !Number.isNaN(timeOf(value));
}
