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
  field?: string | undefined;
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
  field?: string | undefined;
  /** Extra error details */
  errors?: E | undefined;
};

/**
 * The result of a validation.
 * @typeParam T The value type
 * @category Types
 */
export type ValidatorResult<T = unknown, E = unknown> =
  | ValidResult<T>
  | InvalidResult<E>;

/**
 * Validation test function.
 * @typeParam T The value type
 * @category Types
 */
export type ValidatorTest<T = unknown, E = unknown> = (
  value?: unknown,
  field?: string,
) => Promise<ValidatorResult<T, E>>;

/**
 * Extracts the generic error type from a ValidatorTest.
 * @typeParam T a ValidatorTest
 * @category Types
 */
export type ExtractError<T extends ValidatorTest> =
  T extends ValidatorTest<unknown, infer E> ? E : unknown;

/**
 * Extracts the generic value type from a ValidatorTest.
 * @typeParam T a ValidatorTest
 * @category Types
 */
export type ExtractValue<T extends ValidatorTest> =
  T extends ValidatorTest<infer V> ? V : unknown;

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
  config?: Partial<C> | ValidatorTest<unknown, E>,
  ...tests: ValidatorTest<unknown, E>[]
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

/**
 * Checks for a truthy `Symbol.iterator` property, boxing primitives so strings
 * count as iterable.
 * @internal
 */
export function isIterable(value: unknown): value is Iterable<unknown> {
  return Boolean(Reflect.get(Object(value), Symbol.iterator));
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
      String(Reflect.get(parameters, key)),
    );
  }

  return template(parameters);
}

/**
 * Creates a valid result
 * @param result Result fields
 * @param result.value Parsed value
 * @param result.field Field name
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
 * @param result Result fields
 * @param result.message Error message, formatted with `formatMessage`
 * @param result.value Parsed value
 * @param result.field Field name
 * @param result.errors Extra error details, such as per-field errors from `object` and `array`
 * @param result.extras Extra message params
 * @category Helpers
 */
export async function invalid<
  T,
  E = never,
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
  errors?: E | undefined;
  extras?: Omit<P, 'field' | 'value'> | undefined;
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
