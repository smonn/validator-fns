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
  value: unknown
): value is TypeMap[T] {
  return (value === null && kind === "null") || typeof value === kind;
}

type Constructor<T> = new (...args: any[]) => T;

export function instanceOf<T>(
  kind: Constructor<T>,
  value: unknown
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
  value: number | bigint | StringOrArray | MapOrSet
): number | bigint {
  if (typeOf("number", value) || typeOf("bigint", value)) return value;
  if (hasOwnOfType(value, "length", "number")) return value.length;
  if (hasOwnOfType(value, "size", "number")) return value.size;
  return 0;
}

export function min(
  value: number | bigint | StringOrArray | MapOrSet,
  min: number | bigint
) {
  return sizeOf(value) >= min;
}

export function max(
  value: number | bigint | StringOrArray | MapOrSet,
  max: number | bigint
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
  date = "date",
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
  oneOf = "oneOf",
  optional = "optional",
  nullable = "nullable",
  extraProperty = "extraProperty",
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
  property?: string
): ValidationError {
  return { kind, code, value, property };
}

export interface BaseOptions<T = unknown> {
  optional?: boolean | undefined;
  nullable?: boolean | undefined;
  default?: T | undefined;
  oneOf?: ReadonlyArray<T> | undefined;
}

export interface Validator<T> {
  (
    value: unknown,
    property?: string
  ): [T, undefined] | [undefined, ValidationError];
}

type InferReturnType<T, O> = O extends BaseOptions
  ?
      | (O["optional"] extends true ? undefined : never)
      | (O["nullable"] extends true ? null : never)
      | (O["oneOf"] extends ReadonlyArray<unknown> ? O["oneOf"][number] : T)
  : T;

export function validate<T>(validator: Validator<T>, value: unknown) {
  return validator(value);
}

export function assert<T>(
  validator: Validator<T>,
  value: unknown
): asserts value is T {
  const [, error] = validate(validator, value);
  if (error) {
    throw new TypeError(
      `Validation failed: expected ${error.property ?? "value"} to be ${error.kind}; failed on ${error.code}.`
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
  const oneOf = new Set(options?.oneOf ?? []);

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

      if (oneOf.size > 0 && !oneOf.has(value)) {
        return [undefined, error(Kind.string, Code.oneOf, value, property)];
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
  const oneOf = new Set(options?.oneOf ?? []);

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

      if (oneOf.size > 0 && !oneOf.has(value)) {
        return [undefined, error(Kind.number, Code.oneOf, value, property)];
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
  const oneOf = new Set(options?.oneOf ?? []);

  return (value, property) => {
    if (typeOf(Kind.boolean, value)) {
      if (oneOf.size > 0 && !oneOf.has(value)) {
        return [undefined, error(Kind.boolean, Code.oneOf, value, property)];
      }

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

export interface DateOptions extends BaseOptions<Date> {
  before?: Date;
  after?: Date;
}

export function date<O extends DateOptions, R = InferReturnType<Date, O>>(
  options?: O
): Validator<R> {
  const oneOf = new Set(options?.oneOf?.map(value => value.valueOf()) ?? []);

  return (value, property) => {
    if (instanceOf(Date, value) && !Number.isNaN(value.valueOf())) {
      if (instanceOf(Date, options?.after) && value <= options.after) {
        return [undefined, error(Kind.date, Code.min, value, property)];
      }

      if (instanceOf(Date, options?.before) && value >= options.before) {
        return [undefined, error(Kind.date, Code.max, value, property)];
      }

      if (oneOf.size > 0 && !oneOf.has(value.valueOf())) {
        return [undefined, error(Kind.date, Code.oneOf, value, property)];
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
      return [undefined, error(Kind.date, Code.type, value, property)];
    }
  };
}

export interface ArrayOptions<T> extends Omit<BaseOptions<T[]>, 'oneOf'> {
  minLength?: number;
  maxLength?: number;
}

export function array<
  T,
  O extends ArrayOptions<T> = ArrayOptions<T>,
  R = InferReturnType<T[], O>,
>(validate: Validator<T>, options?: O): Validator<R> {
  return (value, property) => {
    if (Array.isArray(value)) {
      let index = 0;

      for (const item of value) {
        const [, error] = validate(
          item,
          property ? `${property}[${index}]` : `[${index}]`
        );
        if (error) {
          return [undefined, error];
        }
        index += 1;
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

export interface ObjectOptions<T> extends Omit<BaseOptions<T>, 'oneOf'> {
  allowExtraProperties?: boolean | undefined;
}

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
  const keyLookup = new Set(keys);

  return (value, property) => {
    if (typeOf("object", value) && value !== null) {
      for (const key of keys) {
        const validator = schema[key];
        const [, error] = validator(
          (value as any)[key],
          property ? `${property}.${String(key)}` : `${String(key)}`
        );
        if (error) {
          return [undefined, error];
        }
      }

      if (!options?.allowExtraProperties) {
        const valueKeys = new Set(
          Object.keys(value).filter((k) => !keyLookup.has(k as keyof T))
        );
        if (valueKeys.size !== 0) {
          return [
            undefined,
            error(Kind.object, Code.extraProperty, value, property),
          ];
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
