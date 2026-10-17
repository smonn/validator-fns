import { assert, expectTypeOf, test } from 'vitest';
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
  max,
  min,
  number,
  object,
  optional,
  string,
  valid,
  type ExtractValue,
  type MinValidatorMessageParameters,
  type SharedValueType,
  type TypeValidator,
  type ValidationTest,
  type ValidatorMessage,
  type ValidatorMessageParameters,
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
  expectTypeOf(string()).toEqualTypeOf<TypeValidator<string, string>>();
  expectTypeOf(number({ requiredMessage: 'required' })).toEqualTypeOf<
    TypeValidator<number, string>
  >();
  expectTypeOf(boolean()).toEqualTypeOf<TypeValidator<boolean, string>>();
  expectTypeOf(date()).toEqualTypeOf<TypeValidator<Date, string>>();
});

test('built-in tests and results without errors have never as the error type', () => {
  expectTypeOf(min(1, 'min')).toEqualTypeOf<
    ValidationTest<string | number | unknown[], never>
  >();
  expectTypeOf(createValidatorTest(() => true, 'message')).toEqualTypeOf<
    ValidationTest<unknown, never>
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
    TypeValidator<string | null | undefined, string>
  >();
  expectTypeOf(optional(object({ name: string() }))).toEqualTypeOf<
    TypeValidator<{ name: string } | null | undefined, { name?: string }>
  >();
  expectTypeOf(optional(array(number()))).toEqualTypeOf<
    TypeValidator<
      number[] | null | undefined,
      string | ArrayItemValidatorResult<string>[]
    >
  >();
  expectTypeOf(optional(numericErrors)).toEqualTypeOf<
    TypeValidator<unknown, number>
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
    TypeValidator<
      { name: string; age?: number | null | undefined },
      { name?: string; age?: string }
    >
  >();
});

const maybe: ValidatorTest<string | undefined> = async () =>
  valid({ value: undefined, field: undefined });

test('object() makes keys optional for validators whose type includes undefined', () => {
  expectTypeOf(object({ maybe, any: numericErrors })).toEqualTypeOf<
    TypeValidator<
      { maybe?: string | undefined; any?: unknown },
      { maybe?: unknown; any?: string | number }
    >
  >();
});

test('object() types a nested field error as its message or its errors', () => {
  expectTypeOf(object({ address: object({ zip: string() }) })).toEqualTypeOf<
    TypeValidator<
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
  ).toEqualTypeOf<TypeValidator<{ name: string }, { name?: string }>>();
  expectTypeOf(
    object(
      { name: string() },
      check((value) => {
        expectTypeOf(value).toEqualTypeOf<{ name: string }>();
        return true;
      }, 'message'),
    ),
  ).toEqualTypeOf<TypeValidator<{ name: string }, { name?: string }>>();
});

test('array() takes its config after the item validator', () => {
  expectTypeOf(
    array(string(), { requiredMessage: 'Pick some.' }, max(2, 'max')),
  ).toEqualTypeOf<
    TypeValidator<string[], string | ArrayItemValidatorResult<string>[]>
  >();
  expectTypeOf(array({ requiredMessage: 'Pick some.' })).toEqualTypeOf<
    TypeValidator<unknown[], string | ArrayItemValidatorResult[]>
  >();
  expectTypeOf(array()).toEqualTypeOf<
    TypeValidator<unknown[], string | ArrayItemValidatorResult[]>
  >();
});

test('array() carries the item value and error types', () => {
  expectTypeOf(array(string())).toEqualTypeOf<
    TypeValidator<string[], string | ArrayItemValidatorResult<string>[]>
  >();
  expectTypeOf(array(optional(string()))).toEqualTypeOf<
    TypeValidator<
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

const anyValue = async (value: unknown, field?: string) =>
  valid({ value, field });

test('validation tests take the parsed value', () => {
  expectTypeOf(min(1, 'min')).toEqualTypeOf<
    ValidationTest<SharedValueType, never>
  >();
  expectTypeOf(
    check((value: { name: string }) => value.name !== '', 'empty'),
  ).toEqualTypeOf<ValidationTest<{ name: string }, never>>();

  // A test for another type doesn't fit, and a test on unknown fits any type.
  const isTrue = createValidatorTest((value: boolean) => value, 'true');
  expectTypeOf(isTrue).not.toExtend<ValidationTest<string, string>>();
  expectTypeOf(isTrue).toExtend<ValidationTest<boolean, string>>();
  expectTypeOf(anyValue).toExtend<ValidationTest<string, string>>();
  string(min(1, 'min'), anyValue);
});

const annotated = (parameters: MinValidatorMessageParameters) =>
  `at least ${parameters.min}`;

test('messages get their extras with the value and field', async () => {
  min(1, (parameters) => {
    expectTypeOf(parameters.min).toEqualTypeOf<number>();
    expectTypeOf(parameters.amount).toEqualTypeOf<number | null | undefined>();
    expectTypeOf(parameters.value).toEqualTypeOf<
      SharedValueType | null | undefined
    >();
    expectTypeOf(parameters.field).toEqualTypeOf<string | undefined>();
    return '';
  });

  // A message annotated with the exported parameters type still fits.
  min(1, annotated);

  // A message that reads extras isn't a plain message, so invalid() takes
  // one only with its extras, and a plain message reads value as unknown.
  type ExtrasMessage = (
    parameters: { count: number } & ValidatorMessageParameters<unknown>,
  ) => string;
  expectTypeOf<ExtrasMessage>().not.toExtend<ValidatorMessage<unknown>>();
  expectTypeOf<
    (parameters: ValidatorMessageParameters<string>) => string
  >().not.toExtend<ValidatorMessage<unknown>>();
  const withExtras = await invalid({
    message: ({ count }: { count: number }) => `count ${count}`,
    value: 1,
    field: undefined,
    extras: { count: 1 },
  });
  assert.deepInclude(withExtras, { message: 'count 1' });
});
