type TypeMap = {
  bigint: bigint;
  boolean: boolean;
  function: (...args: any[]) => any;
  number: number;
  object: object;
  string: string;
  symbol: symbol;
  undefined: undefined;
  null: null;
};

type Types = keyof TypeMap;

export function typeOf<T extends Types>(
  kind: T,
  value: unknown,
): value is TypeMap[T] {
  return (value === null && kind === "null") || typeof value === kind;
}

type Constructor<T> = new (...args: any[]) => T;

export function instanceOf<T>(
  kind: Constructor<T>,
  value: unknown,
): value is T {
  return value instanceof kind;
}

export function hasOwnOfType<
  V extends object,
  K extends string,
  T extends Types,
>(value: V, property: K, type: T): value is V & { [P in K]: TypeMap[T] } {
  return (
    (Object.hasOwn(value, property) || property in value) &&
    typeOf(type, value[property as unknown as keyof V])
  );
}

export interface StringOrArray {
  readonly length: number;
}

export interface MapOrSet {
  readonly size: number;
}

export function sizeOf(
  value: number | bigint | StringOrArray | MapOrSet,
): number | bigint {
  if (typeOf("number", value) || typeOf("bigint", value)) return value;
  if (hasOwnOfType(value, "length", "number")) return value.length;
  if (hasOwnOfType(value, "size", "number")) return value.size;
  return 0;
}

export function min(
  value: number | bigint | StringOrArray | MapOrSet,
  min: number | bigint,
) {
  return sizeOf(value) >= min;
}

export function max(
  value: number | bigint | StringOrArray | MapOrSet,
  max: number | bigint,
) {
  return sizeOf(value) <= max;
}

enum Kind {
  array = "array",
  bigint = "bigint",
  boolean = "boolean",
  null = "null",
  number = "number",
  object = "object",
  string = "string",
  symbol = "symbol",
  undefined = "undefined",
}

enum Code {
  type = "type",
  item = "item",
  integer = "integer",
  min = "min",
  max = "max",
  pattern = "pattern",
  minLength = "minLength",
  maxLength = "maxLength",
  optional = "optional",
  nullable = "nullable",
}

export interface ValidationError {
  kind: Kind;
  code: Code;
  value: unknown;
  property?: string | undefined;
}

export function error(
  kind: Kind,
  code: Code,
  value: unknown,
  property?: string,
): ValidationError {
  return { kind, code, value, property };
}

export interface BaseOptions<T = unknown> {
  optional?: boolean;
  nullable?: boolean;
  default?: T;
}

export interface Validator<T> {
  (
    value: unknown,
    property?: string,
  ): [T, undefined] | [undefined, ValidationError];
}

type InferReturnType<T, O> = O extends BaseOptions
  ?
      | (O["optional"] extends true ? undefined : T)
      | (O["nullable"] extends true ? null : T)
      | T
  : T;

export function validate<T>(validator: Validator<T>, value: unknown) {
  return validator(value);
}

export function assert<T>(
  validator: Validator<T>,
  value: unknown,
): asserts value is T {
  const [, error] = validate(validator, value);
  if (error) {
    throw new TypeError(
      `Validation failed: expected ${error.property ?? "value"} to be ${error.kind}; failed on ${error.code}.`,
    );
  }
}

export function is<T>(validator: Validator<T>, value: unknown): value is T {
  const [, error] = validate(validator, value);
  return !error;
}

export interface StringOptions extends BaseOptions<string> {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
}

export function string<
  O extends StringOptions = StringOptions,
  R = InferReturnType<string, O>,
>(options?: O): Validator<R> {
  return (value, property) => {
    if (typeOf(Kind.string, value)) {
      if (
        instanceOf(RegExp, options?.pattern) &&
        !options.pattern.test(value)
      ) {
        return [undefined, error(Kind.string, Code.pattern, value, property)];
      }

      if (
        typeOf(Kind.number, options?.minLength) &&
        !min(value, options.minLength)
      ) {
        return [undefined, error(Kind.string, Code.minLength, value, property)];
      }

      if (
        typeOf(Kind.number, options?.maxLength) &&
        !max(value, options.maxLength)
      ) {
        return [undefined, error(Kind.string, Code.maxLength, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.undefined, value)) {
      if (!typeOf(Kind.undefined, options?.default)) {
        return [options.default as R, undefined];
      }

      if (!options?.optional) {
        return [undefined, error(Kind.string, Code.optional, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.null, value)) {
      if (!options?.nullable) {
        return [undefined, error(Kind.string, Code.nullable, value, property)];
      }

      return [value as R, undefined];
    } else {
      return [undefined, error(Kind.string, Code.type, value, property)];
    }
  };
}

export interface NumberOptions extends BaseOptions<number> {
  integer?: boolean;
  min?: number;
  max?: number;
}

export function number<
  O extends NumberOptions = NumberOptions,
  R = InferReturnType<number, O>,
>(options?: O): Validator<R> {
  return (value, property) => {
    if (typeOf(Kind.number, value) && !Number.isNaN(value)) {
      if (options?.integer && !Number.isInteger(value)) {
        return [undefined, error(Kind.number, Code.integer, value, property)];
      }

      if (typeOf(Kind.number, options?.min) && !min(value, options.min)) {
        return [undefined, error(Kind.number, Code.min, value, property)];
      }

      if (typeOf(Kind.number, options?.max) && !max(value, options.max)) {
        return [undefined, error(Kind.number, Code.max, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.undefined, value)) {
      if (!typeOf(Kind.undefined, options?.default)) {
        return [options.default as R, undefined];
      }

      if (!options?.optional) {
        return [undefined, error(Kind.number, Code.optional, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.null, value)) {
      if (!options?.nullable) {
        return [undefined, error(Kind.number, Code.nullable, value, property)];
      }

      return [value as R, undefined];
    } else {
      return [undefined, error(Kind.number, Code.type, value, property)];
    }
  };
}

export interface BooleanOptions extends BaseOptions<boolean> {}

export function boolean<
  O extends BooleanOptions = BooleanOptions,
  R = InferReturnType<boolean, O>,
>(options?: O): Validator<R> {
  return (value, property) => {
    if (typeOf(Kind.boolean, value)) {
      return [value as R, undefined];
    } else if (typeOf(Kind.undefined, value)) {
      if (!typeOf(Kind.undefined, options?.default)) {
        return [options.default as R, undefined];
      }

      if (!options?.optional) {
        return [undefined, error(Kind.boolean, Code.optional, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.null, value)) {
      if (!options?.nullable) {
        return [undefined, error(Kind.boolean, Code.nullable, value, property)];
      }

      return [value as R, undefined];
    } else {
      return [undefined, error(Kind.boolean, Code.type, value, property)];
    }
  };
}

export interface ArrayOptions<T> extends BaseOptions<T[]> {
  minLength?: number;
  maxLength?: number;
}

export function array<
  T,
  O extends ArrayOptions<T> = ArrayOptions<T>,
  R = InferReturnType<T[], O>,
>(of: Validator<T>, options?: O): Validator<R> {
  return (value, property) => {
    if (Array.isArray(value)) {
      let itemsValid = true;
      let index = 0;

      for (const item of value) {
        const [, error] = of(
          item,
          property ? `${property}[${index}]` : `[${index}]`,
        );
        if (error) {
          return [undefined, error];
        }
        index += 1;
      }

      if (!itemsValid) {
        return [undefined, error(Kind.array, Code.item, value, property)];
      }

      if (
        typeOf(Kind.number, options?.minLength) &&
        !min(value.length, options.minLength)
      ) {
        return [undefined, error(Kind.array, Code.minLength, value, property)];
      }

      if (
        typeOf(Kind.number, options?.maxLength) &&
        !max(value.length, options.maxLength)
      ) {
        return [undefined, error(Kind.array, Code.maxLength, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.undefined, value)) {
      if (!typeOf(Kind.undefined, options?.default)) {
        return [options.default as R, undefined];
      }

      if (!options?.optional) {
        return [undefined, error(Kind.array, Code.optional, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.null, value)) {
      if (!options?.nullable) {
        return [undefined, error(Kind.array, Code.nullable, value, property)];
      }

      return [value as R, undefined];
    } else {
      return [undefined, error(Kind.array, Code.type, value, property)];
    }
  };
}

export interface ObjectOptions<T> extends BaseOptions<T> {}

export function object<
  T extends { [K in keyof T]: T[K] },
  O extends ObjectOptions<{
    [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
  }> = ObjectOptions<{
    [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
  }>,
  R = InferReturnType<
    { [K in keyof T]: T[K] extends Validator<infer U> ? U : never },
    O
  >,
>(schema: T, options?: O): Validator<R> {
  const keys = Object.keys(schema) as (keyof T)[];
  return (value, property) => {
    if (typeOf("object", value) && value !== null) {
      for (const key of keys) {
        const validator = schema[key];
        const [, error] = validator(
          (value as any)[key],
          property ? `${property}.${String(key)}` : `${String(key)}`,
        );
        if (error) {
          return [undefined, error];
        }
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.undefined, value)) {
      if (!typeOf(Kind.undefined, options?.default)) {
        return [options.default as R, undefined];
      }

      if (!options?.optional) {
        return [undefined, error(Kind.object, Code.optional, value, property)];
      }

      return [value as R, undefined];
    } else if (typeOf(Kind.null, value)) {
      if (!options?.nullable) {
        return [undefined, error(Kind.object, Code.nullable, value, property)];
      }

      return [value as R, undefined];
    } else {
      return [undefined, error(Kind.object, Code.type, value, property)];
    }
  };
}
