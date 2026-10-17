import { findInvalidResult, invalidDetail } from './invalid-detail.js';
import { requirable } from './optional.js';
import {
  type ExtractError,
  type ExtractValue,
  hasOwnProperty,
  invalid,
  valid,
  type ValidatorMessage,
  type ValidatorTest,
} from './shared.js';

export type ObjectParameter = Record<string, ValidatorTest>;

/**
 * Flattens an intersection into one object type, keeping optional keys.
 * @internal
 */
type Flatten<T> = { [K in keyof T]: T[K] };

/**
 * Keys whose validator's value type includes undefined, such as an
 * `optional()` validator's, may be left out. `object()` still sets every key
 * it validates, to `undefined` for a missing one.
 * @internal
 */
type ObjectValue<P extends ObjectParameter> = Flatten<
  {
    [
      K in keyof P as undefined extends ExtractValue<P[K]> ? never : K
    ]: ExtractValue<P[K]>;
  } & {
    [
      K in keyof P as undefined extends ExtractValue<P[K]> ? K : never
    ]?: ExtractValue<P[K]>;
  }
>;

/**
 * A failed field records its message, such as a nested object's
 * `'Required.'`, or its errors when the message is empty.
 * @internal
 */
type ObjectErrors<P extends ObjectParameter> = {
  [K in keyof P]?: string | ExtractError<P[K]>;
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
 * Configuration for object validation.
 * @category Types
 */
export interface ObjectConfig {
  /**
   * Message for a missing object, `undefined` or `null`. Defaults to
   * `'Required.'`.
   */
  requiredMessage?: ValidatorMessage<unknown>;
}

/**
 * Validates an object. The second argument is a configuration object, or the
 * first of the `tests`. The tests run on the parsed object, in order, once
 * every property is valid, and the first failure is the result.
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
  config?: ObjectConfig | ValidatorTest<ObjectValue<P>, ObjectErrors<P>>,
  ...tests: ValidatorTest<ObjectValue<P>, ObjectErrors<P>>[]
): ValidatorTest<V, E> {
  if (typeof properties !== 'object' || properties === null) {
    throw new TypeError('`properties` must be a configuration object');
  }

  const allTests = typeof config === 'function' ? [config, ...tests] : tests;
  const requiredMessage =
    typeof config === 'object' ? config.requiredMessage : undefined;

  return requirable<V, E>(requiredMessage, async (values, field, onEmpty) => {
    if (values === null || values === undefined) {
      return onEmpty(values, field);
    }

    // Object() boxes primitives.
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
      allTests,
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
  });
}
