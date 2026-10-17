import { expectTypeOf, test } from 'vitest';
import {
  applyArrayConfig,
  array,
  type ArrayConfig,
  type ArrayItemValidatorResult,
  boolean,
  check,
  createValidatorTest,
  date,
  invalid,
  min,
  number,
  object,
  optional,
  string,
  valid,
  type ExtractValue,
  type ValidatorResult,
  type ValidatorTest,
} from '../src/index.js';

test('validator types default to unknown', () => {
  type Valid = Extract<ValidatorResult, { state: 'valid' }>;
  type Invalid = Extract<ValidatorResult, { state: 'invalid' }>;
  expectTypeOf<Valid['value']>().toEqualTypeOf<unknown>();
  expectTypeOf<Invalid['errors']>().toEqualTypeOf<unknown>();
  expectTypeOf<
    Awaited<ReturnType<ValidatorTest>>
  >().toEqualTypeOf<ValidatorResult>();
});

test('type validators carry their value type and string errors', () => {
  expectTypeOf(string()).toEqualTypeOf<ValidatorTest<string, string>>();
  expectTypeOf(number({ requiredMessage: 'required' })).toEqualTypeOf<
    ValidatorTest<number, string>
  >();
  expectTypeOf(boolean()).toEqualTypeOf<ValidatorTest<boolean, string>>();
  expectTypeOf(date()).toEqualTypeOf<ValidatorTest<Date, string>>();
});

test('built-in tests and results without errors have never as the error type', () => {
  expectTypeOf(min(1, 'min')).toEqualTypeOf<
    ValidatorTest<string | number | unknown[], never>
  >();
  expectTypeOf(createValidatorTest(() => true, 'message')).toEqualTypeOf<
    ValidatorTest<unknown, never>
  >();
  expectTypeOf(
    invalid({ message: 'message', value: 1, field: undefined }),
  ).toEqualTypeOf<Promise<ValidatorResult<unknown, never>>>();
});

const numericErrors: ValidatorTest<unknown, number> = async (value, field) =>
  invalid({ message: 'message', value, field, errors: 1 });

test('type validators reject tests whose errors are not strings', () => {
  expectTypeOf<
    typeof numericErrors extends Parameters<typeof string>[0] ? true : false
  >().toEqualTypeOf<false>();
});

test('optional() adds null and undefined to the value type', () => {
  expectTypeOf(optional(string())).toEqualTypeOf<
    ValidatorTest<string | null | undefined, string>
  >();
  expectTypeOf(optional(object({ name: string() }))).toEqualTypeOf<
    ValidatorTest<{ name: string } | null | undefined, { name?: string }>
  >();
  expectTypeOf(optional(array(number()))).toEqualTypeOf<
    ValidatorTest<
      number[] | null | undefined,
      string | ArrayItemValidatorResult<string>[]
    >
  >();
  expectTypeOf(optional(numericErrors)).toEqualTypeOf<
    ValidatorTest<unknown, number>
  >();
});

test('valid results carry the value type without null or undefined', () => {
  type Valid<V extends ValidatorTest> = Extract<
    Awaited<ReturnType<V>>,
    { state: 'valid' }
  >['value'];
  expectTypeOf<Valid<ReturnType<typeof string>>>().toEqualTypeOf<string>();
  expectTypeOf<Valid<typeof optionalString>>().toEqualTypeOf<
    string | null | undefined
  >();
});

const optionalString = optional(string());

test('object() makes keys optional only for optional() validators', () => {
  expectTypeOf(
    object({ name: string(), age: optional(number()) }),
  ).toEqualTypeOf<
    ValidatorTest<
      { name: string; age?: number | null | undefined },
      { name?: string; age?: string }
    >
  >();
});

const maybe: ValidatorTest<string | undefined> = async () =>
  valid({ value: undefined, field: undefined });

test('object() makes keys optional for validators whose type includes undefined', () => {
  expectTypeOf(object({ maybe, any: numericErrors })).toEqualTypeOf<
    ValidatorTest<
      { maybe?: string | undefined; any?: unknown },
      { maybe?: unknown; any?: string | number }
    >
  >();
});

test('object() types a nested field error as its message or its errors', () => {
  expectTypeOf(object({ address: object({ zip: string() }) })).toEqualTypeOf<
    ValidatorTest<
      { address: { zip: string } },
      { address?: string | { zip?: string } }
    >
  >();
});

test('object() accepts its value with undefined for a missing optional key', () => {
  const validate = object({ name: string(), age: optional(number()) });
  expectTypeOf<{
    name: string;
    age: undefined;
  }>().toExtend<ExtractValue<typeof validate>>();
});

test('object() takes a config object or a test as its second argument', () => {
  expectTypeOf(
    object({ name: string() }, { requiredMessage: 'required' }),
  ).toEqualTypeOf<ValidatorTest<{ name: string }, { name?: string }>>();
  expectTypeOf(
    object(
      { name: string() },
      check((value) => {
        expectTypeOf(value).toEqualTypeOf<{ name: string }>();
        return true;
      }, 'message'),
    ),
  ).toEqualTypeOf<ValidatorTest<{ name: string }, { name?: string }>>();
});

test('array() carries the item value and error types', () => {
  expectTypeOf(array(string())).toEqualTypeOf<
    ValidatorTest<string[], string | ArrayItemValidatorResult<string>[]>
  >();
  expectTypeOf(array(optional(string()))).toEqualTypeOf<
    ValidatorTest<
      (string | null | undefined)[],
      string | ArrayItemValidatorResult<string>[]
    >
  >();
});

test('results have no isValid property', () => {
  expectTypeOf<ValidatorResult>().not.toHaveProperty('isValid');
});

test('applyArrayConfig returns unknown items and takes no type argument', () => {
  expectTypeOf(applyArrayConfig).toEqualTypeOf<
    (config: ArrayConfig, value: unknown) => unknown[] | null | undefined
  >();
});
