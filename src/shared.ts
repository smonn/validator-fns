export type ValidResult<T> = {
  /**
   * True if the original value is valid according to all validation tests
   * @deprecated Use `state` instead.
   */
  isValid: true;
  /** This is preferred to use over `isValid` as it works better for type guards. */
  state: 'valid';
  /** The parsed value. Note that may be different than the original value. */
  value: T | null | undefined;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string;
};

export type InvalidResult<T, E> = {
  /**
   * True if the original value is valid according to all validation tests.
   * @deprecated Use `state` instead.
   */
  isValid: false;
  /** This is preferred to use over `isValid` as it works better for type guards. */
  state: 'invalid';
  /** The parsed value. Note that may be different than the original value. */
  value: T | null | undefined;
  /** Error message if `state` is invalid. */
  message: string;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string;
  /** Extra error details */
  errors?: E;
};

/**
 * The result of a validation.
 * @typeParam T The value type
 * @category Types
 */
export type ValidatorResult<T = any, E = any> =
  | ValidResult<T>
  | InvalidResult<T, E>;

/**
 * Validation test function.
 * @typeParam T The value type
 * @category Types
 */
export interface ValidatorTest<T = any, E = any> {
  (value: T | null | undefined, field?: string): Promise<ValidatorResult<T, E>>;
}

/**
 * Validation factory function.
 * @typeParam C The configuration type
 * @category Types
 */
export interface ValidatorFactory<C> {
  (
    config?: Partial<C> | ValidatorTest,
    ...tests: ValidatorTest[]
  ): ValidatorTest;
}

/**
 * Base configuration type.
 * @typeParam T The target type.
 * @category Types
 */
export interface ConfigBase<T> {
  /** Parser to convert value into the designated type. */
  parser: (value: unknown) => T | null | undefined;
  /** Provide a fallback value in case the original value is undefined. */
  default?: T;
}

export interface ValidatorMessageParams<T> {
  value: T | null | undefined;
  field: string | undefined;
}

/**
 * Validation message. May be a plain string or a function that accepts arguments.
 * While using a string, values in squiggly brackets `{}` are replaced.
 * @category Types
 */
export type ValidatorMessage<
  T,
  P extends ValidatorMessageParams<T> = ValidatorMessageParams<T>
> = string | ((params: P) => string);

/**
 * Simple check for objects.
 * @param value Value to test
 */
export function isObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Safe hasOwnProperty check
 * @param obj Object to check
 * @param prop Property to look for
 */
export function hasOwnProperty(obj: unknown, prop: string | number | symbol) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/** @internal */
const formatPattern = /\{(\w+)\}/g;

/**
 * Formats a message using a squiggly bracket `{}` template.
 * @param template Message template as string or function
 * @param params Params to inject into template
 * @category Helpers
 */
export function formatMessage<T, P extends ValidatorMessageParams<T>>(
  template: ValidatorMessage<T, P>,
  params: P
): string {
  if (typeof template === 'string') {
    return template.replace(formatPattern, (_, key: string) =>
      String((params as Record<string, unknown>)[key])
    );
  }
  return template(params);
}

/**
 * Creates a valid result
 * @param value Parsed value
 * @param field Field name
 * @category Helpers
 */
export async function valid<T, E = never>({
  value,
  field,
}: {
  value: T | null | undefined;
  field: string | undefined;
}): Promise<ValidatorResult<T, E>> {
  return {
    isValid: true,
    state: 'valid',
    value,
    field,
  };
}

/**
 * Creates an invalid result.
 * @param message Error message
 * @param value Parsed value
 * @param field Field name
 * @param extras Extra message params
 * @category Helpers
 */
export async function invalid<T, E, P extends ValidatorMessageParams<T>>({
  errors,
  field,
  message,
  value,
  extras,
}: {
  message: ValidatorMessage<T, P>;
  value: T | null | undefined;
  field: string | undefined;
  errors?: E;
  extras?: Omit<P, 'field' | 'value'>;
}): Promise<ValidatorResult<T, E>> {
  return {
    isValid: false,
    state: 'invalid',
    message: formatMessage(message, { ...(extras || {}), value, field } as P),
    value,
    field,
    errors,
  };
}

/**
 * Creates a type validator.
 * @typeParam T The basic type for the final value to be validated.
 * @typeParam C The configuration type.
 * @param defaultParser Parser to convert value into type.
 * @param applyConfig Function that applies configuration to value.
 * @category Helpers
 */
export function createTypeValidatorTest<T, C extends ConfigBase<T>>(
  defaultConfig: C,
  applyConfig: (value: unknown, config: C) => T | null | undefined
): ValidatorFactory<C> {
  return (config, ...tests) => {
    const cache: Record<string, ValidatorResult<T>> = {};
    let finalConfig = defaultConfig;
    let allTests = tests;

    if (config !== undefined) {
      if (typeof config !== 'function') {
        finalConfig = {
          ...defaultConfig,
          ...config,
        };
      } else {
        allTests = [config, ...tests];
      }
    }

    return async (value, field) => {
      try {
        const parsedValue = applyConfig(value, finalConfig);
        const parsedValueString = String(parsedValue);
        if (hasOwnProperty(cache, parsedValueString)) {
          return cache[parsedValueString];
        }

        for (const validatorTest of allTests) {
          const result = await validatorTest(parsedValue, field);
          if (result.state === 'invalid') {
            cache[parsedValueString] = result;
            return result;
          }
        }

        cache[parsedValueString] = await valid({ value: parsedValue, field });
        return cache[parsedValueString];
      } catch (err) {
        return await invalid({
          message: err.message,
          value,
          field,
        });
      }
    };
  };
}

/**
 * Captures basic validator test pattern
 * @param test Test function
 * @param message Error message
 * @param getExtras Optional extra fields for error message
 */
export function createValidatorTest<
  T = any,
  E = any,
  P extends ValidatorMessageParams<T> = ValidatorMessageParams<T>
>(
  test: (value: T | null | undefined, field?: string) => boolean,
  message: ValidatorMessage<T, P>,
  getExtras?: (value: T | null | undefined) => any
): ValidatorTest<T, E> {
  return async (value, field) => {
    if (test(value, field)) {
      return await valid({ value, field });
    }

    return await invalid({
      message,
      value,
      field,
      extras: getExtras ? getExtras(value) : undefined,
    });
  };
}

/**
 * Ensures a value is not undefined, null, empty string, NaN, nor invalid date.
 * @param message Error message
 * @param nullable Allow null values
 * @category Validation Tests
 */
export function required<T, P extends ValidatorMessageParams<T>>(
  message: ValidatorMessage<T, P>,
  nullable?: boolean
): ValidatorTest<T> {
  return createValidatorTest(
    value =>
      (nullable && value === null) ||
      (value !== null &&
        value !== undefined &&
        !(typeof value === 'string' && value === '') &&
        !(typeof value === 'number' && Number.isNaN(value)) &&
        !(value instanceof Date && Number.isNaN(value.valueOf()))),
    message
  );
}

export type SharedValueType = string | number | Array<unknown>;

/**
 * Extracts a numeric amount from value, i.e. string length, array length, or number.
 * @internal
 */
function getAmount(value: SharedValueType | null | undefined) {
  return typeof value === 'string' || Array.isArray(value)
    ? value.length
    : value;
}

export interface MaxValidatorMessageParams
  extends ValidatorMessageParams<SharedValueType> {
  max: number;
  amount: number;
  exclusive?: boolean;
}

/**
 * Ensures a string, number, or array value is at most a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @param exclusive Use exclusive comparison instead of inclusive
 * @category Validation Tests
 */
export function max(
  limit: number,
  message: ValidatorMessage<SharedValueType, MaxValidatorMessageParams>,
  exclusive?: boolean
): ValidatorTest<SharedValueType> {
  return createValidatorTest(
    value => {
      const amount = getAmount(value);
      return (
        amount === undefined ||
        amount === null ||
        value === '' ||
        (exclusive ? amount < limit : amount <= limit)
      );
    },
    message,
    value => ({
      max: limit,
      limit,
      amount: getAmount(value),
      exclusive,
    })
  );
}

export interface MinValidatorMessageParams
  extends ValidatorMessageParams<SharedValueType> {
  min: number;
  limit: number;
  amount: number;
  exclusive?: boolean;
}

/**
 * Ensures a string, number, or array value is at most a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @param exclusive Use exclusive comparison instead of inclusive
 * @category Validation Tests
 */
export function min(
  limit: number,
  message: ValidatorMessage<SharedValueType, MinValidatorMessageParams>,
  exclusive?: boolean
): ValidatorTest<SharedValueType> {
  return createValidatorTest(
    value => {
      const amount = getAmount(value);
      return (
        amount === undefined ||
        amount === null ||
        value === '' ||
        (exclusive ? amount > limit : amount >= limit)
      );
    },
    message,
    value => ({
      min: limit,
      limit,
      amount: getAmount(value),
      exclusive,
    })
  );
}

export interface ExactValidatorMessageParams
  extends ValidatorMessageParams<SharedValueType> {
  limit: number;
  amount: number;
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
  message: ValidatorMessage<SharedValueType, ExactValidatorMessageParams>
): ValidatorTest<SharedValueType> {
  return createValidatorTest(
    value => {
      const amount = getAmount(value);
      return (
        amount === undefined ||
        amount === null ||
        value === '' ||
        amount === limit
      );
    },
    message,
    value => ({
      amount: getAmount(value),
      limit,
      exact: limit,
    })
  );
}

export interface OneOfValidatorMessageParams<T>
  extends ValidatorMessageParams<T> {
  values: T[];
}

/**
 * Ensures a value is one in a predefined list.
 * @param values List of allowed values.
 * @param message Error message
 * @category Validation Tests
 */
export function oneOf<T extends string | number | boolean | Date>(
  values: readonly T[],
  message: ValidatorMessage<T, OneOfValidatorMessageParams<T>>
): ValidatorTest<T> {
  return createValidatorTest(
    value =>
      value === undefined ||
      value === null ||
      values.includes(value) ||
      (value instanceof Date &&
        !!values.find(x => x.valueOf() === value.valueOf())),
    message,
    () => ({ values })
  );
}
