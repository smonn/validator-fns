import { createValidatorTest } from './factories.js';
import type {
  MessageExtras,
  Test,
  ValidatorMessage,
  ValidatorMessageParameters,
} from './shared.js';

/** @internal */
type SharedValueType = string | number | unknown[];

/**
 * A message for a test on an amount, with the extras of its parameters type.
 * @internal
 */
type AmountMessage<P extends ValidatorMessageParameters<SharedValueType>> =
  ValidatorMessage<SharedValueType, MessageExtras<P>>;

/**
 * Extracts a numeric amount from value, i.e. string length, array length, or number.
 * @internal
 */
function getAmount(value: SharedValueType): number {
  if (typeof value === 'number') {
    return value;
  }

  // Wider than the type, since JavaScript callers can pass a missing value,
  // which has no amount (#660).
  const given: unknown = value;
  return given === null || given === undefined ? Number.NaN : value.length;
}

export interface MaxValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  max: number;
  amount: number | null | undefined;
}

/**
 * Ensures a string, number, or array value is at most a certain amount.
 * @param limit Size or value limit
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function max(
  limit: number,
  message?: AmountMessage<MaxValidatorMessageParameters>,
): Test<SharedValueType, never> {
  return createValidatorTest(
    'max',
    (value: SharedValueType) => getAmount(value) <= limit,
    message,
    (value: SharedValueType) => ({ max: limit, amount: getAmount(value) }),
  );
}

export interface MinValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  min: number;
  amount: number | null | undefined;
}

/**
 * Ensures a string, number, or array value is at least a certain amount.
 * @param limit Size or value limit
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function min(
  limit: number,
  message?: AmountMessage<MinValidatorMessageParameters>,
): Test<SharedValueType, never> {
  return createValidatorTest(
    'min',
    (value: SharedValueType) => getAmount(value) >= limit,
    message,
    (value: SharedValueType) => ({ min: limit, amount: getAmount(value) }),
  );
}

export interface ExactValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  exact: number;
  amount: number | null | undefined;
}

/**
 * Ensures a string, number, or array value is exactly a certain amount.
 * @param limit Size or value limit
 * @param message Error message, or else the code
 * @category Validation Tests
 */
export function exact(
  limit: number,
  message?: AmountMessage<ExactValidatorMessageParameters>,
): Test<SharedValueType, never> {
  return createValidatorTest(
    'exact',
    (value: SharedValueType) => getAmount(value) === limit,
    message,
    (value: SharedValueType) => ({ exact: limit, amount: getAmount(value) }),
  );
}
