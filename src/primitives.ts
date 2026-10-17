/** @internal */
const primitiveValueOfs = [
  (value: object) => String.prototype.valueOf.call(value),
  (value: object) => Number.prototype.valueOf.call(value),
  (value: object) => Boolean.prototype.valueOf.call(value),
];

/**
 * Returns the primitive inside a `String`, `Number`, or `Boolean` object, and
 * any other value as it is.
 * @param value Value to unbox
 */
function unboxPrimitive(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  // Each valueOf throws unless `this` is its own wrapper type, from any realm,
  // which `instanceof` can't tell.
  for (const valueOf of primitiveValueOfs) {
    try {
      return valueOf(value);
    } catch {
      // Not this wrapper type.
    }
  }

  return value;
}

/**
 * Converts a string, number, bigint, or boolean, or an object wrapping one, to
 * a string.
 * @param value Value to convert
 * @returns The string, or `undefined` for any other value
 */
export function primitiveToString(value: unknown): string | undefined {
  const primitive = unboxPrimitive(value);
  switch (typeof primitive) {
    case 'string':
    case 'number':
    case 'bigint':
    case 'boolean': {
      return String(primitive);
    }
    default: {
      return undefined;
    }
  }
}
