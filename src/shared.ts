/**
 * The result of a validation.
 * @typeParam T The value type
 * @category Types
 */
export interface ValidatorResult<T> {
  /** True if the original value is valid according to all validation tests */
  isValid: boolean;
  /** The parsed value. Note that may be different than the original value. */
  value: T | null | undefined;
  /** Error message if `isValid` is false. */
  message?: string;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string;
}

/**
 * Validation test function.
 * @typeParam T The value type
 * @category Types
 */
export interface ValidatorTest<T> {
  (value: T | null | undefined, field?: string): Promise<ValidatorResult<T>>;
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
 * Ensures a value is not undefined or null.
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
        !(typeof value === 'number' && value !== value))
    ) {
      return Promise.resolve(valid(value, field));
    }

    return Promise.resolve(invalid(message, value, field, { value, field }));
  };
}

/**
 * Creates a type validator.
 * @typeParam T The basic type for the final value to be validated.
 * @typeParam C The configuration type.
 * @param parser Parser to convert value into type.
 * @param applyConfig Function that applies configuration to value.
 * @category Helpers
 */
export function createTypeValidatorTest<T, C>(
  parser: (value: unknown) => T | null | undefined,
  applyConfig: (
    value: T | null | undefined,
    config: Partial<C>
  ) => T | null | undefined
): ValidatorFactory<C> {
  return (config, ...tests) => {
    return async (value, field) => {
      let parsedValue = parser(value);
      let allTests = tests;

      if (config !== undefined) {
        if (typeof config !== 'function') {
          parsedValue = applyConfig(parsedValue, config);
        } else {
          allTests = [config, ...tests];
        }
      }

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
export function valid<T>(
  value: T | null | undefined,
  field: string | undefined
): ValidatorResult<T> {
  return {
    isValid: true,
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
export function invalid<T>(
  message: ValidatorMessage,
  value: T | null | undefined,
  field: string | undefined,
  extras: Record<string, unknown> = {}
): ValidatorResult<T> {
  return {
    isValid: false,
    message: formatMessage(message, { ...extras, value, field }),
    value,
    field,
  };
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
      return Promise.resolve(valid(value, field));
    }

    return Promise.resolve(
      invalid(message, value, field, { max: limit, amount })
    );
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
      return Promise.resolve(valid(value, field));
    }

    return Promise.resolve(
      invalid(message, value, field, { min: limit, amount })
    );
  };
}
