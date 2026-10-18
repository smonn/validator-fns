import {
  configAndTests,
  defineType,
  properties as propertiesOf,
  type TypeValidator,
  unknownKeys,
} from './pipeline/index.js';
import {
  type ExtractError,
  type ExtractValue,
  type Failure,
  type Messages,
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
  values: Record<string, unknown>,
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
  /**
   * Fails an object with an own enumerable string key outside the schema
   * with `unknownKeys`, before any property runs. Without it, unknown keys
   * are left out of the value.
   */
  strict?: boolean;
}

/**
 * Whether `object()` accepts a present value: an object other than an array,
 * a function or a boxed primitive, from any realm. Each wrapper's `valueOf`
 * throws unless `this` is its own type, which `instanceof` can't tell across
 * realms.
 * @internal
 */
function isRecordLike(value: unknown): value is object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  // Plain objects and class instances, the common case, skip the brand
  // checks, whose throws are slow. Without a Symbol.toStringTag, the tag reads
  // the internal slots, so a String, Number or Boolean wrapper keeps its own
  // tag whatever its prototype. A Symbol or BigInt wrapper has no such tag, so
  // one with a swapped prototype passes (#779).
  if (
    !(Symbol.toStringTag in value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  ) {
    return true;
  }
  // BigInt is missing before Safari 14, and no boxed BigInt exists without it.
  const wrappers =
    typeof BigInt === 'function'
      ? [String, Number, Boolean, Symbol, BigInt]
      : [String, Number, Boolean, Symbol];
  return !wrappers.some(({ prototype }) => {
    try {
      Reflect.apply(prototype.valueOf, value, []);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Validates an object. The second argument is a configuration object, or the
 * first of the `tests`. A strict object fails unknown keys before any property
 * runs. The tests run on the parsed object, in order, once every property is
 * valid, and the first failure is the result.
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

  const children = propertiesOf(properties, {
    tree: (): ObjectErrors<P> => ({}),
    value: asObjectValue<P>,
  });
  const split = configAndTests(config, tests);
  return defineType({
    isType: isRecordLike,
    expected: 'object',
    build: {},
    messages: split.config.messages,
    gate: split.config.strict ? [unknownKeys(properties)] : [],
    children,
    steps: split.tests,
  });
}
