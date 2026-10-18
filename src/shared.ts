/**
 * A valid result.
 * @typeParam T The value type
 * @category Types
 */
export type Valid<T> = {
  /** `valid` if the value passed every test. */
  state: 'valid';
  /**
   * The parsed value. Note that may be different than the original value.
   * Type validators only pass a missing value inside `optional()`.
   */
  value: T;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string | undefined;
};

/**
 * The result for invalid input. It has no `value`, so reading a result's
 * `value` needs `state === 'valid'` first.
 * @typeParam E The error type
 * @category Types
 */
export type Failure<E> = {
  /** `invalid` if the value failed a test. */
  state: 'invalid';
  /** What failed, such as `min` for `min()` or `required` for a missing value. */
  code: string;
  /** The code's parameters, such as `{ min, amount }` for `min`. */
  params: Record<string, unknown>;
  /** The message passed to the test or set in the config, or else the code. */
  message: string;
  /** Field name if provided. Automatically provided if using object validation. */
  field?: string | undefined;
  /** Extra error details */
  errors?: E | undefined;
};

/**
 * What a validator resolves to: valid or a failure.
 * @typeParam T The value type
 * @typeParam E The error type
 * @category Types
 */
export type Result<T = unknown, E = unknown> = Valid<T> | Failure<E>;

/**
 * A function that takes unknown input and a field, and resolves to a result.
 * @typeParam T The value type
 * @typeParam E The error type
 * @category Types
 */
export type Validator<T = unknown, E = unknown> = (
  value?: unknown,
  field?: string,
) => Promise<Result<T, E>>;

/**
 * A test, such as `min()`: it checks a parsed value. Type validators run
 * their tests on the parsed value once it's present, so a test takes the
 * validator's value type. Its own result value is never read.
 * @typeParam T The value type the test checks
 * @typeParam E The error type
 * @category Types
 */
export type Test<T = unknown, E = unknown> = (
  value: T,
  field?: string,
) => Promise<Result<unknown, E>>;

/**
 * Extracts the generic error type from a Validator.
 * @typeParam T a Validator
 * @category Types
 */
export type ExtractError<T extends Validator> =
  T extends Validator<unknown, infer E> ? E : unknown;

/**
 * Extracts the generic value type from a Validator.
 * @typeParam T a Validator
 * @category Types
 */
export type ExtractValue<T extends Validator> =
  T extends Validator<infer V> ? V : unknown;

/**
 * Base configuration type.
 * @typeParam T The target type.
 * @internal
 */
export interface ConfigBase<T> {
  /**
   * Converts the input into the designated type. It never gets `undefined` or
   * `null`, which are missing. It returns a result: valid with the parsed
   * value, made with `valid()`, or a failure for input it can't read, made
   * with `invalid()`. A throw is a bug, and the validator rejects with it.
   */
  parser: (
    value: unknown,
    field?: string,
  ) => Result<T | null | undefined> | Promise<Result<T | null | undefined>>;
  /**
   * Value for missing input, `undefined` or `null`. It skips the parser, and
   * the tests run on it.
   */
  default?: T;
  /**
   * Messages for the validator's own failures, keyed by code, such as
   * `required` for a missing value, `undefined` or `null`, that `default`
   * doesn't fill.
   */
  messages?: Messages;
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
 * Messages keyed by code. A message function gets the failure's params with
 * the value and field.
 * @typeParam C The codes
 * @category Types
 */
export type Messages<C extends string = string> = {
  [K in C]: ValidatorMessage<unknown, Record<string, unknown>>;
};

/**
 * The codes of the built-in tests and type validators.
 * @category Types
 */
export type BuiltInCode =
  | 'min'
  | 'max'
  | 'exact'
  | 'minDate'
  | 'maxDate'
  | 'oneOf'
  | 'matches'
  | 'url'
  | 'integer'
  | 'email'
  | 'uuid'
  | 'required'
  | 'type'
  | 'items'
  | 'properties';

/**
 * Safe hasOwnProperty check
 * @param object Object to check
 * @param property Property to look for
 * @internal
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
export function setOwn(target: object, key: PropertyKey, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
/** @internal */
const formatPattern = /{(\w+)}/g;

/**
 * Formats a message using a squiggly bracket `{}` template.
 * @param template Message template as string or function
 * @param parameters Params to inject into template
 * @internal
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
}): Promise<Result<T, E>> {
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
}): Result<T, E> {
  return {
    state: 'valid',
    value,
    field,
  };
}
