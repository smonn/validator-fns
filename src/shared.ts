export type ValidResult<T> = {
  /** True if the original value is valid according to all validation tests */
  isValid: true;
  /** This is preferred to use over `isValid` as it works better for type guards. */
  state: 'valid';
  /** The parsed value. Note that may be different than the original value. */
  value: T | null | undefined;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string;
};

export type InvalidResult<T, E> = {
  /** True if the original value is valid according to all validation tests */
  isValid: false;
  /** This is preferred to use over `isValid` as it works better for type guards. */
  state: 'invalid';
  /** The parsed value. Note that may be different than the original value. */
  value: T | null | undefined;
  /** Error message if `isValid` is false. */
  message: string;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string;
  /** Extra error details */
  errors: E;
};

/**
 * The result of a validation.
 * @typeParam T The value type
 * @category Types
 */
export type ValidatorResult<T, E> = ValidResult<T> | InvalidResult<T, E>;

/**
 * Validation test function.
 * @typeParam T The value type
 * @category Types
 */
export interface ValidatorTest<T, E = unknown> {
  (value: T | null | undefined, field?: string): Promise<ValidatorResult<T, E>>;
}

/**
 * Validation factory function.
 * @typeParam C The configuration type
 * @category Types
 */
export interface ValidatorFactory<C> {
  (
    config?: Partial<C> | ValidatorTest<unknown>,
    ...tests: ValidatorTest<unknown>[]
  ): ValidatorTest<unknown>;
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

/**
 * Validation message. May be a plain string or a function that accepts arguments.
 * While using a string, values in squiggly brackets `{}` are replaced.
 * @category Types
 */
export type ValidatorMessage =
  | string
  | ((params: Record<string, unknown>) => string);

/** @internal */
const formatPattern = /\{(\w+)\}/g;

/**
 * Formats a message using a squiggly bracket `{}` template.
 * @param template Message template as string or function
 * @param params Params to inject into template
 * @category Helpers
 */
export function formatMessage(
  template: ValidatorMessage,
  params: Record<string, unknown>
): string {
  if (typeof template === 'string') {
    return template.replace(formatPattern, (_, key) => String(params[key]));
  }
  return template(params);
}

/**
 * Ensures a value is not undefined, null, empty string, NaN, nor invalid date.
 * @param message Error message
 * @param nullable Allow null values
 * @category Validation Tests
 */
export function required(
  message: ValidatorMessage,
  nullable?: boolean
): ValidatorTest<unknown> {
  return (value, field) => {
    if (
      (nullable && value === null) ||
      (value !== null &&
        value !== undefined &&
        value !== '' &&
        !(typeof value === 'number' && value !== value) &&
        !(value instanceof Date && Number.isNaN(value.valueOf())))
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null, { value, field });
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
      const parsedValue = applyConfig(value, finalConfig);

      const results = await Promise.all(
        allTests.map((validatorTest) => validatorTest(parsedValue, field))
      );

      const firstInvalid = results.find((result) => result.isValid === false);
      if (firstInvalid && !firstInvalid.isValid) {
        return firstInvalid;
      }

      return valid(parsedValue, field);
    };
  };
}

/**
 * Creates a valid result
 * @param value Parsed value
 * @param field Field name
 * @category Helpers
 */
export function valid<T, E = never>(
  value: T | null | undefined,
  field: string | undefined
): Promise<ValidatorResult<T, E>> {
  return Promise.resolve({
    isValid: true,
    state: 'valid',
    value,
    field,
  });
}

/**
 * Creates an invalid result.
 * @param message Error message
 * @param value Parsed value
 * @param field Field name
 * @param extras Extra message params
 * @category Helpers
 */
export function invalid<T, E>(
  message: ValidatorMessage,
  value: T | null | undefined,
  field: string | undefined,
  errors: E,
  extras: Record<string, unknown> = {}
): Promise<ValidatorResult<T, E>> {
  return Promise.resolve({
    isValid: false,
    state: 'invalid',
    message: formatMessage(message, { ...extras, value, field }),
    value,
    field,
    errors,
  });
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
  message: ValidatorMessage,
  exclusive?: boolean
): ValidatorTest<string | number | Array<unknown>> {
  return (value, field) => {
    const amount =
      typeof value === 'string' || Array.isArray(value) ? value.length : value;

    if (
      amount === undefined ||
      amount === null ||
      value === '' ||
      (exclusive ? amount < limit : amount <= limit)
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null, { max: limit, amount });
  };
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
  message: ValidatorMessage,
  exclusive?: boolean
): ValidatorTest<string | number | Array<unknown>> {
  return (value, field) => {
    const amount =
      typeof value === 'string' || Array.isArray(value) ? value.length : value;

    if (
      amount === undefined ||
      amount === null ||
      value === '' ||
      (exclusive ? amount > limit : amount >= limit)
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null, { min: limit, amount });
  };
}

/**
 * Ensures a string, number, or array value is exactly a certain amount.
 * @param limit Size or value limit
 * @param message Error message
 * @category Validation Tests
 */
export function exact(
  limit: number,
  message: ValidatorMessage
): ValidatorTest<string | number | Array<unknown>> {
  return (value, field) => {
    const amount =
      typeof value === 'string' || Array.isArray(value) ? value.length : value;
    if (
      amount === undefined ||
      amount === null ||
      value === '' ||
      amount === limit
    ) {
      return valid(value, field);
    }

    return invalid(message, value, field, null, { amount, exact: limit });
  };
}
