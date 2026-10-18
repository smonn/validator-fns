import {
  formatMessage,
  invalidResult,
  validResult,
  type ValidatorMessage,
  type Result,
  type Validator,
} from './shared.js';
import { type TypeValidator, withStandard } from './standard.js';

/**
 * Message for a missing value when the validator's config sets none.
 * @internal
 */
const defaultRequiredMessage = 'Required.';

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
 * Whether a parsed value that isn't null or undefined still counts as missing:
 * an empty string, NaN or an invalid date.
 * @internal
 */
export function isBlank(value: unknown): boolean {
  return (
    value === '' ||
    (typeof value === 'number' && Number.isNaN(value)) ||
    (value instanceof Date && Number.isNaN(value.getTime()))
  );
}

/**
 * Makes a type validator that rejects a missing value with `requiredMessage`,
 * and the twin `optional()` returns, which accepts it. `validate` parses the
 * input and hands a missing parsed value to `onEmpty`; the two differ only in
 * what `onEmpty` returns. Both return `validate`'s promise as is, since another
 * async layer would cost a microtask per call.
 * @internal
 */
export function requirable<T, E>(
  requiredMessage: ValidatorMessage<T> | undefined,
  validate: <V>(
    value: unknown,
    field: string | undefined,
    onEmpty: (
      parsed: T | null | undefined,
      field: string | undefined,
    ) => Result<V, E>,
  ) => Promise<Result<T | V, E>>,
): TypeValidator<T, E> {
  const message =
    requiredMessage === undefined ? defaultRequiredMessage : requiredMessage;
  const reject = (parsed: T | null | undefined, field: string | undefined) =>
    invalidResult<E>({
      message: formatMessage(message, { value: parsed, field }),
      field,
    });
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
 * Lets a type validator accept a missing value: `undefined`, `null`, an empty
 * string, `NaN` or an invalid date, judged after parsing and `default`. A
 * missing value skips the tests and is the result's value as parsed. Any other
 * validator, such as a custom one, gets `undefined` and `null` accepted as
 * they are, and every other value passed on.
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
