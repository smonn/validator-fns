import { createValidatorTest } from './factories.js';
import type {
  MessageExtras,
  Test,
  ValidatorMessage,
  ValidatorMessageParameters,
} from './shared.js';

export type SharedValueType = string | number | unknown[];

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
  limit: number;
}

/**
 * Ensures a string, number, or array value is at most a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @category Validation Tests
 */
export function max(
  limit: number,
  message: ValidatorMessage<
    SharedValueType,
    MessageExtras<MaxValidatorMessageParameters>
  >,
): Test<SharedValueType, never> {
  return createValidatorTest(
    (value: SharedValueType) => getAmount(value) <= limit,
    message,
    (value) => ({
      max: limit,
      limit,
      amount: getAmount(value),
    }),
  );
}

export interface MinValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
  min: number;
  limit: number;
  amount: number | null | undefined;
}

/**
 * Ensures a string, number, or array value is at least a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @category Validation Tests
 */
export function min(
  limit: number,
  message: ValidatorMessage<
    SharedValueType,
    MessageExtras<MinValidatorMessageParameters>
  >,
): Test<SharedValueType, never> {
  return createValidatorTest(
    (value: SharedValueType) => getAmount(value) >= limit,
    message,
    (value) => ({
      min: limit,
      limit,
      amount: getAmount(value),
    }),
  );
}

export interface ExactValidatorMessageParameters extends ValidatorMessageParameters<SharedValueType> {
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
  message: ValidatorMessage<
    SharedValueType,
    MessageExtras<ExactValidatorMessageParameters>
  >,
): Test<SharedValueType, never> {
  return createValidatorTest(
    (value: SharedValueType) => getAmount(value) === limit,
    message,
    (value) => ({
      amount: getAmount(value),
      limit,
      exact: limit,
    }),
  );
}
