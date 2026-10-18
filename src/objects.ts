import {
  childField,
  failure,
  fillOwn,
  propertiesTree,
} from './failures/index.js';
import { runTests } from './invalid-detail.js';
import { parseRecord, requirable } from './optional.js';
import { ownValue, propertiesOf } from './properties.js';
import type { TypeValidator } from './standard.js';
import {
  type ExtractError,
  type ExtractValue,
  type Failure,
  type Messages,
  type Result,
  setOwn,
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
 * An object's errors tree: each failed property's failure, in schema order.
 * @internal
 */
type ObjectErrors<P extends ObjectParameter> = {
  [K in keyof P]?: Failure<ExtractError<P[K]>>;
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

  const validators = propertiesOf(properties);

  const allTests = typeof config === 'function' ? [config, ...tests] : tests;
  const messages = typeof config === 'object' ? config.messages : undefined;

  return requirable<ObjectValue<P>, ObjectErrors<P>>(
    messages,
    async (values, field, onEmpty) => {
      // Missing input has no properties, so each child runs on undefined, and
      // the object is built from the children when they're all valid.
      const isMissing = values === null || values === undefined;
      const parsed = parseRecord(isMissing ? {} : values, field);
      if (parsed.state === 'invalid') {
        return fillOwn(parsed, messages);
      }

      const results: [key: string, result: Result][] = [];
      const resolvedValues: Partial<Record<keyof P, unknown>> = {};

      for (const [key, validator] of validators) {
        const result = await validator(
          ownValue(parsed.value, key),
          childField(field, key),
        );
        results.push([key, result]);
        if (result.state === 'valid') {
          setOwn(resolvedValues, key, result.value);
        }
      }

      const errors = propertiesTree<ObjectErrors<P>>(results, {});
      if (errors && isMissing) {
        return onEmpty(values, field);
      }
      if (errors) {
        const container = failure({
          code: 'properties',
          params: {},
          value: values,
          field,
          errors,
        });
        return fillOwn(container, messages);
      }

      const result = await runTests(
        allTests,
        asObjectValue<P>(resolvedValues),
        field,
      );
      return result.state === 'invalid' ? fillOwn(result, messages) : result;
    },
  );
}
