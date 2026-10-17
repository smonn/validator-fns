export type ValidResult<T> = {
  /** `valid` if the value passed every validation test. */
  state: 'valid';
  /**
   * The parsed value. Note that may be different than the original value.
   * Type validators only pass a missing value inside `optional()`.
   */
  value: T;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string | undefined;
};

export type InvalidResult<E> = {
  /** `invalid` if the value failed a validation test. */
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
 * Validation test function, such as `min()`: it checks a parsed value. Type
 * validators run their tests on the parsed value once it's present, so a test
 * takes the validator's value type. Its own result value is never read.
 * @typeParam T The value type the test checks
 * @typeParam E The error type
 * @category Types
 */
export type ValidationTest<T = unknown, E = unknown> = (
  value: T,
  field?: string,
) => Promise<ValidatorResult<unknown, E>>;

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
  config?: Partial<C> | ValidationTest<T, E>,
  ...tests: ValidationTest<T, E>[]
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
  /**
   * Message for a missing value: `undefined`, `null`, an empty string, `NaN`
   * or an invalid date after parsing and `default`. Defaults to `'Required.'`.
   */
  requiredMessage?: ValidatorMessage<T>;
}

export interface ValidatorMessageParameters<T> {
  value: T | null | undefined;
  field: string | undefined;
}

/**
 * The extra parameters of a message parameters type, without the value and
 * field every message gets.
 * @internal
 */
export type MessageExtras<P extends ValidatorMessageParameters<unknown>> = Omit<
  P,
  'value' | 'field'
>;

/**
 * Validation message. May be a plain string or a function that accepts arguments.
 * While using a string, values in squiggly brackets `{}` are replaced.
 * A function gets the value and field, and any extra parameters `X` the test
 * adds, such as `min` for `min()`.
 * @typeParam T The value type
 * @typeParam X The extra parameters
 * @category Types
 */
export type ValidatorMessage<T, X extends object = object> =
  | string
  | ((parameters: X & ValidatorMessageParameters<T>) => string);

/**
 * Paths into nested plain objects, as lists of property names, for `check()`.
 * Arrays, dates and functions end a path.
 * @internal
 */
export type KeyPath<T> = T extends
  | readonly unknown[]
  | Date
  | ((...args: never[]) => unknown)
  ? never
  : T extends object
    ? {
        [K in keyof T & string]:
          | readonly [K]
          | readonly [K, ...KeyPath<NonNullable<T[K]>>];
      }[keyof T & string]
    : never;

/**
 * The errors with a message at `Path` that `check()` produces, such as
 * `{ shipping?: { zip?: string } }` for `['shipping', 'zip']`.
 * @internal
 */
export type AtPath<Path> = Path extends readonly [
  infer Head extends string,
  ...infer Rest,
]
  ? { [P in Head]?: AtPath<Rest> }
  : string;

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
 * Sets an own property. Plain assignment of `__proto__` calls the
 * `Object.prototype.__proto__` setter instead of creating the property.
 * @internal
 */
export function setOwn(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * The errors with `message` at `key`, for `check()`.
 * @internal
 */
export function errorAtKey<K extends string>(
  key: K,
  message: string,
): { [P in K]?: string } {
  const errors: { [P in K]?: string } = {};
  setOwn(errors, key, message);
  return errors;
}

/**
 * The errors with `message` at `path`, for `check()`. The one type assertion
 * it needs: no loop can build the recursive type `AtPath<Path>`.
 * @internal
 */
export function errorAt<Path extends readonly string[]>(
  path: Path,
  message: string,
): AtPath<Path> {
  // Computed keys define own properties, so a `__proto__` key stays one.
  const errors = path.reduceRight<unknown>(
    (inner, key) => ({ [key]: inner }),
    message,
  );
  return errors as AtPath<Path>;
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
export function formatMessage<T, X extends object = object>(
  template: ValidatorMessage<T, X>,
  parameters: X & ValidatorMessageParameters<T>,
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
export async function valid<T, E = never>(result: {
  value: T;
  field: string | undefined;
}): Promise<ValidatorResult<T, E>> {
  return validResult(result);
}

/**
 * Creates a valid result synchronously, for `valid` and the built-in tests'
 * synchronous twins.
 * @internal
 */
export function validResult<T, E = never>({
  value,
  field,
}: {
  value: T;
  field: string | undefined;
}): ValidatorResult<T, E> {
  return {
    state: 'valid',
    value,
    field,
  };
}

/**
 * Creates an invalid result synchronously from a formatted message, for
 * `invalid` and the built-in tests' synchronous twins.
 * @internal
 */
export function invalidResult<E = never>({
  errors,
  field,
  message,
  value,
}: {
  message: string;
  value: unknown;
  field: string | undefined;
  errors?: E | undefined;
}): InvalidResult<E> {
  return {
    state: 'invalid',
    message,
    value,
    field,
    errors,
  };
}
