import { hasOwnProperty, type Validator } from './shared.js';

/**
 * Each own key of `object()`'s properties and its validator, read once when
 * the validator is built. Throws a `TypeError` naming a key whose value isn't
 * a function.
 * @internal
 */
export function propertiesOf(
  properties: Record<string, Validator>,
): [key: string, validator: Validator][] {
  const validators: [key: string, validator: Validator][] = [];
  for (const key in properties) {
    if (hasOwnProperty(properties, key)) {
      const validator = properties[key];
      if (typeof validator !== 'function') {
        throw new TypeError(`\`${key}\` must be a validator`);
      }
      validators.push([key, validator]);
    }
  }

  return validators;
}

/**
 * The value of an object's own property, or `undefined`, so a missing key named
 * like an inherited one, such as `constructor`, reads as missing.
 * @internal
 */
export function ownValue(objectValue: object, key: string): unknown {
  return hasOwnProperty(objectValue, key)
    ? Reflect.get(objectValue, key)
    : undefined;
}
