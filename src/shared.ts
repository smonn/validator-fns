/**
 * From type-fest: https://github.com/sindresorhus/type-fest/blob/HEAD/source/except.d.ts
 * @internal
 */
type Except<ObjectType, KeysType extends keyof ObjectType> = Pick<
  ObjectType,
  Exclude<keyof ObjectType, KeysType>
>;

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

export type InvalidResult<E> = {
  /**
   * True if the original value is valid according to all validation tests.
   * @deprecated Use `state` instead.
   */
  isValid: false;
  /** This is preferred to use over `isValid` as it works better for type guards. */
  state: 'invalid';
  /** The parsed value. Note that may be different than the original value. */
  value: unknown;
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
  | InvalidResult<E>;

/**
 * Validation test function.
 * @typeParam T The value type
 * @category Types
 */
export type ValidatorTest<T = any, E = any> = (
  value?: unknown,
  field?: string,
) => Promise<ValidatorResult<T, E>>;

/**
 * Extracts the generic error type from a ValidatorTest.
 * @typeParam T a ValidatorTest
 * @category Types
 */
export type ExtractError<T extends ValidatorTest> = T extends ValidatorTest<
  any,
  infer E
>
  ? E
  : unknown;

/**
 * Extracts the generic value type from a ValidatorTest.
 * @typeParam T a ValidatorTest
 * @category Types
 */
export type ExtractValue<T extends ValidatorTest> = T extends ValidatorTest<
  infer V
>
  ? V
  : unknown;

/**
 * Make a deep partial type.
 * @typeParam T any object type
 * @category Types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Validation factory function.
 * @typeParam C The configuration type
 * @category Types
 */
export type ValidatorFactory<C, T, E> = (
  config?: Partial<C> | ValidatorTest,
  ...tests: ValidatorTest[]
) => ValidatorTest<T, E>;

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

export interface ValidatorMessageParameters<T> {
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
  P extends ValidatorMessageParameters<T> = ValidatorMessageParameters<T>,
> = string | ((parameters: P) => string);

/**
 * Simple check for objects.
 * @param value Value to test
 */
export function isObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Safe hasOwnProperty check
 * @param object Object to check
 * @param property Property to look for
 */
export function hasOwnProperty(
  object: unknown,
  property: string | number | symbol,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

/** @internal */
const formatPattern = /{(\w+)}/g;

/**
 * Formats a message using a squiggly bracket `{}` template.
 * @param template Message template as string or function
 * @param parameters Params to inject into template
 * @category Helpers
 */
export function formatMessage<T, P extends ValidatorMessageParameters<T>>(
  template: ValidatorMessage<T, P>,
  parameters: P,
): string {
  if (typeof template === 'string') {
    return template.replaceAll(formatPattern, (_, key: string) =>
      String((parameters as Record<string, unknown>)[key]),
    );
  }

  return template(parameters);
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
export async function invalid<
  T,
  E,
  P extends ValidatorMessageParameters<T> = ValidatorMessageParameters<T>,
>({
  errors,
  field,
  message,
  value,
  extras,
}: {
  message: ValidatorMessage<T, P>;
  value: unknown;
  field: string | undefined;
  errors?: E;
  extras?: Except<P, 'field' | 'value'>;
}): Promise<ValidatorResult<T, E>> {
  return {
    isValid: false,
    state: 'invalid',
    message: formatMessage(message, { ...extras, value, field } as P),
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
  applyConfig: (value: unknown, config: C) => T | null | undefined,
): ValidatorFactory<C, T, string> {
  return (config, ...tests) => {
    const cache: Record<string, ValidatorResult<T>> = {};
    let finalConfig = defaultConfig;
    let allTests = tests;

    if (config !== undefined) {
      if (typeof config === 'function') {
        allTests = [config, ...tests];
      } else {
        finalConfig = {
          ...defaultConfig,
          ...config,
        };
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
          // eslint-disable-next-line no-await-in-loop
          const result = await validatorTest(parsedValue, field);
          if (result.state === 'invalid') {
            cache[parsedValueString] = result;
            return result;
          }
        }

        cache[parsedValueString] = await valid({ value: parsedValue, field });
        return cache[parsedValueString];
      } catch (error) {
        return invalid({
          message: error instanceof Error ? error.message : String(error),
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
  P extends ValidatorMessageParameters<T> = ValidatorMessageParameters<T>,
>(
  test: (value: unknown, field?: string) => boolean,
  message: ValidatorMessage<T, P>,
  getExtras?: (value: T | null | undefined) => Except<P, 'value' | 'field'>,
): ValidatorTest<T, E> {
  return async (value, field) => {
    if (test(value, field)) {
      return valid({ value: value as T, field });
    }

    return invalid({
      message,
      value,
      field,
      extras: getExtras ? getExtras(value as T) : undefined,
    });
  };
}

/**
 * Ensures a value is not undefined, null, empty string, NaN, nor invalid date.
 * @param message Error message
 * @param nullable Allow null values
 * @category Validation Tests
 */
export function required<T, P extends ValidatorMessageParameters<T>>(
  message: ValidatorMessage<T, P>,
  nullable?: boolean,
): ValidatorTest<T> {
  return createValidatorTest(
    (value) =>
      (nullable && value === null) ||
      (value !== null &&
        value !== undefined &&
        !(typeof value === 'string' && value === '') &&
        !(typeof value === 'number' && Number.isNaN(value)) &&
        !(value instanceof Date && Number.isNaN(value.valueOf()))),
    message,
  );
}

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

export interface MaxValidatorMessageParameters
  extends ValidatorMessageParameters<SharedValueType> {
  max: number;
  amount: number | null | undefined;
  limit: number;
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
  message: ValidatorMessage<SharedValueType, MaxValidatorMessageParameters>,
  exclusive?: boolean,
): ValidatorTest<SharedValueType> {
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

export interface MinValidatorMessageParameters
  extends ValidatorMessageParameters<SharedValueType> {
  min: number;
  limit: number;
  amount: number | null | undefined;
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
  message: ValidatorMessage<SharedValueType, MinValidatorMessageParameters>,
  exclusive?: boolean,
): ValidatorTest<SharedValueType> {
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

export interface ExactValidatorMessageParameters
  extends ValidatorMessageParameters<SharedValueType> {
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
): ValidatorTest<SharedValueType> {
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

export interface OneOfValidatorMessageParameters<T>
  extends ValidatorMessageParameters<T> {
  values: readonly T[];
}

/**
 * Ensures a value is one in a predefined list.
 * @param values List of allowed values.
 * @param message Error message
 * @category Validation Tests
 */
export function oneOf<T extends string | number | boolean | Date>(
  values: readonly T[],
  message: ValidatorMessage<T, OneOfValidatorMessageParameters<T>>,
): ValidatorTest<T> {
  return createValidatorTest(
    (value) =>
      value === undefined ||
      value === null ||
      values.includes(value as T) ||
      (value instanceof Date &&
        values.some((x) => x.valueOf() === value.valueOf())),
    message,
    () => ({ values }),
  );
}
