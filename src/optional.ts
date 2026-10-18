import { failure, fillOwn } from './failures/index.js';
import {
  validResult,
  type Messages,
  type Result,
  type Validator,
} from './shared.js';
import { type TypeValidator, withStandard } from './standard.js';

/**
 * Key for the twin that `optional()` returns, set on every built-in type
 * validator. Module-private, so only validators made here carry it.
 * @internal
 */
const optionalTwin = Symbol('optional');

/** @internal */
type OptionalTwin<T, E> = {
  readonly [optionalTwin]?: TypeValidator<T | null | undefined, E>;
};

/**
 * Whether `object()` accepts a present value: an object other than an array,
 * a function or a boxed primitive, from any realm. Each wrapper's `valueOf`
 * throws unless `this` is its own type, which `instanceof` can't tell across
 * realms.
 * @internal
 */
export function isObject(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ![String, Number, Boolean, BigInt, Symbol].some(({ prototype }) => {
      try {
        Reflect.apply(prototype.valueOf, value, []);
        return true;
      } catch {
        return false;
      }
    })
  );
}

/**
 * Makes a type validator that fails a missing value with `required`, worded
 * by `messages`, and the twin `optional()` returns, which accepts it.
 * `validate` parses the input and hands a missing parsed value to `onEmpty`;
 * the two differ only in what `onEmpty` returns. Both return `validate`'s
 * promise as is, since another async layer would cost a microtask per call.
 * @internal
 */
export function requirable<T, E>(
  messages: Messages | undefined,
  validate: <V>(
    value: unknown,
    field: string | undefined,
    onEmpty: (
      parsed: T | null | undefined,
      field: string | undefined,
    ) => Result<V, E>,
  ) => Promise<Result<T | V, E>>,
): TypeValidator<T, E> {
  const reject = (parsed: T | null | undefined, field: string | undefined) =>
    fillOwn(
      failure<E>({ code: 'required', params: {}, value: parsed, field }),
      messages,
    );
  const accept = (parsed: T | null | undefined, field: string | undefined) =>
    validResult<T | null | undefined, E>({ value: parsed, field });
  const required: Validator<T, E> = (value, field) =>
    validate(value, field, reject);
  const twin: Validator<T | null | undefined, E> = (value, field) =>
    validate(value, field, accept);

  return Object.assign(withStandard(required), {
    [optionalTwin]: withStandard(twin),
  });
}

/**
 * Lets a type validator accept a missing value, `undefined` or `null`, that
 * `default` doesn't fill. A missing value skips the parser and the tests, and
 * is the result's value as it is. Any other validator, such as a custom one,
 * gets `undefined` and `null` accepted the same way, and every other value
 * passed on.
 * @category Helpers
 */
export function optional<T, E>(
  validator: Validator<T, E> & OptionalTwin<T, E>,
): TypeValidator<T | null | undefined, E> {
  const twin = validator[optionalTwin];
  if (twin !== undefined) {
    return twin;
  }

  return withStandard(async (value?: unknown, field?: string) =>
    value === null || value === undefined
      ? validResult<T | null | undefined, E>({ value, field })
      : validator(value, field),
  );
}
