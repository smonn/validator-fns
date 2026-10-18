/**
 * Whether a value is a date.
 * @internal
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}
