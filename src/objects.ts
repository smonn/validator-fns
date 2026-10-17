import { findInvalidResult, invalidDetail } from './invalid-detail.js';
import {
  type ExtractError,
  type ExtractValue,
  hasOwnProperty,
  invalid,
  valid,
  type ValidatorTest,
} from './shared.js';

export type ObjectParameter = Record<string, ValidatorTest>;

/** @internal */
type ObjectValue<P extends ObjectParameter> = {
  // A field's validator passes null through unless a test rejects it.
  [K in keyof P]?: ExtractValue<P[K]> | null;
};

/** @internal */
type ObjectErrors<P extends ObjectParameter> = {
  [K in keyof P]?: ExtractError<P[K]>;
};

/**
 * Sets an own property. Plain assignment of `__proto__` calls the
 * `Object.prototype.__proto__` setter instead of creating the property.
 * @internal
 */
function setOwn(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Validates an object. The remaining `tests` run on the parsed object, in
 * order, once every property is valid, and the first failure is the result.
 * @category Type Validators
 */
export function object<
  P extends ObjectParameter,
  V extends ObjectValue<P>,
  E extends ObjectErrors<P>,
>(
  properties: P,
  // Typed from P rather than V and E, so the tests don't take part in
  // inferring V and E.
  ...tests: ValidatorTest<ObjectValue<P>, ObjectErrors<P>>[]
): ValidatorTest<V, E> {
  if (typeof properties !== 'object' || properties === null) {
    throw new TypeError('`properties` must be a configuration object');
  }

  return async (values, field) => {
    // Object() boxes primitives and turns null and undefined into {}.
    const source: object = Object(values);
    const errors = {} as E;
    const resolvedValues = {} as V;
    let isValid = true;

    for (const key in properties) {
      if (hasOwnProperty(properties, key)) {
        const validator = properties[key];
        // Only own properties, so a missing key named like an inherited one,
        // such as `constructor`, reads as missing.
        const value: unknown = hasOwnProperty(source, key)
          ? Reflect.get(source, key)
          : undefined;
        const result = await (typeof validator === 'function'
          ? validator(value, key)
          : invalid({ field: key, message: 'No validator set', value }));

        setOwn(resolvedValues, key, result.value);

        if (result.state === 'invalid') {
          isValid = false;
          setOwn(errors, key, invalidDetail(result));
        }
      }
    }

    if (!isValid) {
      return invalid({ message: '', value: values, field, errors });
    }

    const objectInvalidResult = await findInvalidResult(
      tests,
      resolvedValues,
      field,
    );
    if (objectInvalidResult) {
      return invalid({
        message: objectInvalidResult.message,
        value: values,
        field,
        errors: objectInvalidResult.errors as E,
      });
    }

    return valid({ value: resolvedValues, field });
  };
}
