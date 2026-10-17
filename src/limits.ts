import { createValidatorTest } from './factories.js';
import type {
  ValidatorMessage,
  ValidatorMessageParameters,
  Validator,
} from './shared.js';

/** @deprecated v3 removes this, with no replacement. */
export type SharedValueType = string | number | unknown[];

/**
 * Extracts a numeric amount from value, i.e. string length, array length, or number.
 * @internal
 */
function getAmount(value: SharedValueType | null | undefined) {
  return typeof value === 'string' || Array.isArray(value)
    ? value.length
    : value;
}

export interface MaxValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  max: number;
  amount: number | null | undefined;
  /** @deprecated v3 removes this. Use `max` instead. */
  limit: number;
  /** @deprecated v3 removes this, with the `exclusive` argument. */
  exclusive?: boolean | undefined;
}

/**
 * Ensures a string, number, or array value is at most a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @category Validation Tests
 */
export function max(
  limit: number,
  message: ValidatorMessage<SharedValueType, MaxValidatorMessageParameters>,
): Validator<SharedValueType>;
/**
 * Ensures a string, number, or array value is at most a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @param exclusive Use exclusive comparison instead of inclusive
 * @category Validation Tests
 * @deprecated v3 removes `exclusive`. In v3, use `check()` instead, such as
 * `check((n) => n < 10, message)`.
 */
export function max(
  limit: number,
  message: ValidatorMessage<SharedValueType, MaxValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<SharedValueType>;
export function max(
  limit: number,
  message: ValidatorMessage<SharedValueType, MaxValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<SharedValueType> {
  return createValidatorTest(
    (value) => {
      const amount = getAmount(value as SharedValueType);
      return (
        amount === undefined ||
        amount === null ||
        value === '' ||
        (exclusive ? amount < limit : amount <= limit)
      );
    },
    message,
    (value) => ({
      max: limit,
      limit,
      amount: getAmount(value),
      exclusive,
    }),
  );
}

export interface MinValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  min: number;
  /** @deprecated v3 removes this. Use `min` instead. */
  limit: number;
  amount: number | null | undefined;
  /** @deprecated v3 removes this, with the `exclusive` argument. */
  exclusive?: boolean | undefined;
}

/**
 * Ensures a string, number, or array value is at least a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @category Validation Tests
 */
export function min(
  limit: number,
  message: ValidatorMessage<SharedValueType, MinValidatorMessageParameters>,
): Validator<SharedValueType>;
/**
 * Ensures a string, number, or array value is at least a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @param exclusive Use exclusive comparison instead of inclusive
 * @category Validation Tests
 * @deprecated v3 removes `exclusive`. In v3, use `check()` instead, such as
 * `check((n) => n > 0, message)`.
 */
export function min(
  limit: number,
  message: ValidatorMessage<SharedValueType, MinValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<SharedValueType>;
export function min(
  limit: number,
  message: ValidatorMessage<SharedValueType, MinValidatorMessageParameters>,
  exclusive?: boolean,
): Validator<SharedValueType> {
  return createValidatorTest(
    (value) => {
      const amount = getAmount(value as SharedValueType);
      return (
        amount === undefined ||
        amount === null ||
        value === '' ||
        (exclusive ? amount > limit : amount >= limit)
      );
    },
    message,
    (value) => ({
      min: limit,
      limit,
      amount: getAmount(value),
      exclusive,
    }),
  );
}

export interface ExactValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  /** @deprecated v3 removes this. Use `exact` instead. */
  limit: number;
  amount: number | null | undefined;
  exact: number;
}

/**
 * Ensures a string, number, or array value is exactly a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @category Validation Tests
 */
export function exact(
  limit: number,
  message: ValidatorMessage<SharedValueType, ExactValidatorMessageParameters>,
): Validator<SharedValueType> {
  return createValidatorTest(
    (value) => {
      const amount = getAmount(value as SharedValueType);
      return (
        amount === undefined ||
        amount === null ||
        value === '' ||
        amount === limit
      );
    },
    message,
    (value) => ({
      amount: getAmount(value),
      limit,
      exact: limit,
    }),
  );
}
