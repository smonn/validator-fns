import { failure, fillOwn } from './failures/index.js';
import { findInvalidResult, invalidDetail } from './invalid-detail.js';
import { requirable } from './optional.js';
import type { TypeValidator } from './standard.js';
import {
  type ExtractError,
  type ExtractValue,
  hasOwnProperty,
  type Messages,
  setOwn,
  valid,
  type Test,
  type Validator,
} from './shared.js';

export type ObjectParameter = Record<string, Validator>;

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
 * The parsed object, typed from the validators. The only type assertion in
 * `object()`: `values` holds each validator's result value for every key of
 * `properties`, but no loop can produce the mapped type `ObjectValue<P>`,
 * since inside it `P[key]` is a union over all the keys.
 * @internal
 */
function asObjectValue<P extends ObjectParameter>(
  values: Partial<Record<keyof P, unknown>>,
): ObjectValue<P> {
  // Permanent, approved in #657 (2.5a). Reconsider if TypeScript can check a
  // mapped type built key by key.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- no loop can build ObjectValue<P>, see above
  return values as ObjectValue<P>;
}

/**
 * Configuration for object validation.
 * @category Types
 */
export interface ObjectConfig {
  /**
   * Messages for the object's own failures, keyed by code, such as `required`
   * for a missing object, `undefined` or `null`.
   */
  messages?: Messages;
}

/**
 * Validates an object. The second argument is a configuration object, or the
 * first of the `tests`. The tests run on the parsed object, in order, once
 * every property is valid, and the first failure is the result.
 * @category Type Validators
 */
export function object<P extends ObjectParameter>(
  properties: P,
  config?: ObjectConfig | Test<ObjectValue<P>, ObjectErrors<P>>,
  ...tests: Test<ObjectValue<P>, ObjectErrors<P>>[]
): TypeValidator<ObjectValue<P>, ObjectErrors<P>> {
  if (typeof properties !== 'object' || properties === null) {
    throw new TypeError('`properties` must be a configuration object');
  }

  const allTests = typeof config === 'function' ? [config, ...tests] : tests;
  const messages = typeof config === 'object' ? config.messages : undefined;

  return requirable<ObjectValue<P>, ObjectErrors<P>>(
    messages,
    async (values, field, onEmpty) => {
      if (values === null || values === undefined) {
        return onEmpty(values, field);
      }

      // Object() boxes primitives.
      const source: object = Object(values);
      const errors: ObjectErrors<P> = {};
      const resolvedValues: Partial<Record<keyof P, unknown>> = {};
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
            : failure({
                code: 'validator',
                params: {},
                message: 'No validator set',
                field: key,
              }));

          if (result.state === 'invalid') {
            isValid = false;
            setOwn(errors, key, invalidDetail(result));
          } else {
            setOwn(resolvedValues, key, result.value);
          }
        }
      }

      const parsed = asObjectValue<P>(resolvedValues);
      const own = isValid
        ? await findInvalidResult(allTests, parsed, field)
        : failure({
            code: 'properties',
            params: {},
            value: values,
            field,
            errors,
          });
      if (own) {
        return fillOwn(own, messages);
      }

      return valid({ value: parsed, field });
    },
  );
}
