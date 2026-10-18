import { assert, expectTypeOf, test } from 'vitest';
import {
  array,
  type ArrayConfig,
  boolean,
  type BooleanConfig,
  type BuiltInCode,
  check,
  createValidatorTest,
  date,
  invalid,
  max,
  maxDate,
  min,
  minDate,
  number,
  object,
  optional,
  string,
  transform,
  valid,
  type DateConfig,
  type ExactValidatorMessageParameters,
  type ExtractValue,
  type Failure,
  type Messages,
  type MaxDateValidatorMessageParameters,
  type MaxValidatorMessageParameters,
  type MinDateValidatorMessageParameters,
  type MinValidatorMessageParameters,
  type NumberConfig,
  type ObjectConfig,
  type Result,
  type StringConfig,
  type Test,
  type TypeValidator,
  type Valid,
  type Validator,
  type ValidatorMessage,
  type ValidatorMessageParameters,
} from '../src/index.js';

test('validator types default to unknown', () => {
  type DefaultValid = Extract<Result, { state: 'valid' }>;
  type DefaultFailure = Extract<Result, { state: 'invalid' }>;
  expectTypeOf<DefaultValid['value']>().toEqualTypeOf<unknown>();
  expectTypeOf<DefaultFailure['errors']>().toEqualTypeOf<unknown>();
  expectTypeOf<Awaited<ReturnType<Validator>>>().toEqualTypeOf<Result>();
});

test('type validators carry their value type and string errors', () => {
  expectTypeOf(string()).toEqualTypeOf<TypeValidator<string, string>>();
  expectTypeOf(number({ messages: { required: 'required' } })).toEqualTypeOf<
    TypeValidator<number, string>
  >();
  expectTypeOf(boolean()).toEqualTypeOf<TypeValidator<boolean, string>>();
  expectTypeOf(date()).toEqualTypeOf<TypeValidator<Date, string>>();
});

test('built-in tests and results without errors have never as the error type', () => {
  expectTypeOf(min(1, 'min')).toEqualTypeOf<
    Test<string | number | unknown[], never>
  >();
  expectTypeOf(createValidatorTest('code', () => true)).toEqualTypeOf<
    Test<unknown, never>
  >();
  expectTypeOf(
    invalid({ code: 'custom', message: 'message', value: 1, field: undefined }),
  ).toEqualTypeOf<Promise<Result<unknown, never>>>();
});

const numericErrors: Validator<unknown, number> = async (value, field) =>
  invalid({ code: 'custom', message: 'message', value, field, errors: 1 });

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
    TypeValidator<
      { name: string } | null | undefined,
      { name?: Failure<string> }
    >
  >();
  expectTypeOf(optional(array(number()))).toEqualTypeOf<
    TypeValidator<number[] | null | undefined, (Failure<string> | null)[]>
  >();
  expectTypeOf(optional(numericErrors)).toEqualTypeOf<
    TypeValidator<unknown, number>
  >();
});

test('valid results carry the value type without null or undefined', () => {
  type ValidValue<V extends Validator> = Extract<
    Awaited<ReturnType<V>>,
    { state: 'valid' }
  >['value'];
  expectTypeOf<ValidValue<ReturnType<typeof string>>>().toEqualTypeOf<string>();
  expectTypeOf<ValidValue<typeof optionalString>>().toEqualTypeOf<
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
      { name?: Failure<string>; age?: Failure<string> }
    >
  >();
});

const maybe: Validator<string | undefined> = async () =>
  valid({ value: undefined, field: undefined });

test('object() makes keys optional for validators whose type includes undefined', () => {
  expectTypeOf(object({ maybe, any: numericErrors })).toEqualTypeOf<
    TypeValidator<
      { maybe?: string | undefined; any?: unknown },
      { maybe?: Failure<unknown>; any?: Failure<number> }
    >
  >();
});

test('object() types a field error as the field validator failure', () => {
  expectTypeOf(object({ address: object({ zip: string() }) })).toEqualTypeOf<
    TypeValidator<
      { address: { zip: string } },
      { address?: Failure<{ zip?: Failure<string> }> }
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
    object({ name: string() }, { messages: { required: 'required' } }),
  ).toEqualTypeOf<
    TypeValidator<{ name: string }, { name?: Failure<string> }>
  >();
  expectTypeOf(
    object(
      { name: string() },
      check((value) => {
        expectTypeOf(value).toEqualTypeOf<{ name: string }>();
        return true;
      }, 'message'),
    ),
  ).toEqualTypeOf<
    TypeValidator<{ name: string }, { name?: Failure<string> }>
  >();
});

test('array() takes its config after the item validator', () => {
  expectTypeOf(
    array(string(), { messages: { required: 'Pick some.' } }, max(2, 'max')),
  ).toEqualTypeOf<TypeValidator<string[], (Failure<string> | null)[]>>();
  expectTypeOf(array({ messages: { required: 'Pick some.' } })).toEqualTypeOf<
    TypeValidator<unknown[], (Failure<unknown> | null)[]>
  >();
  expectTypeOf(array()).toEqualTypeOf<
    TypeValidator<unknown[], (Failure<unknown> | null)[]>
  >();
});

test('array() carries the item value and error types', () => {
  expectTypeOf(array(string())).toEqualTypeOf<
    TypeValidator<string[], (Failure<string> | null)[]>
  >();
  expectTypeOf(array(optional(string()))).toEqualTypeOf<
    TypeValidator<(string | null | undefined)[], (Failure<string> | null)[]>
  >();
});

test('array() tests take the parsed items', () => {
  array(
    string(),
    (value, field) => {
      expectTypeOf(value).toEqualTypeOf<string[]>();
      return valid({ value, field });
    },
    min(1),
  );
  // @ts-expect-error a test on numbers doesn't fit an array of strings
  array(string(), async (value: number[], field?: string) =>
    valid({ value, field }),
  );
  // @ts-expect-error a test's valid value keeps the items' type
  array(string(), async (value: string[], field?: string) =>
    valid({ value: value.length, field }),
  );
});

test('object() takes a strict option', () => {
  expectTypeOf<ObjectConfig['strict']>().toEqualTypeOf<boolean | undefined>();
  expectTypeOf(object({ a: string() }, { strict: true })).toEqualTypeOf<
    TypeValidator<{ a: string }, { a?: Failure<string> }>
  >();
});

test('results have no isValid property', () => {
  expectTypeOf<Result>().not.toHaveProperty('isValid');
});

test('a failure has no value key, so reading value needs the valid state', () => {
  expectTypeOf<Failure<unknown>>().not.toHaveProperty('value');
  expectTypeOf<Result>().not.toHaveProperty('value');
  expectTypeOf<Valid<string>>().toHaveProperty('value');
});

test('invalid() takes value only for the message, and may leave it out', () => {
  expectTypeOf(
    invalid({ code: 'custom', message: 'message', field: undefined }),
  ).toEqualTypeOf<Promise<Result<unknown, never>>>();
});

test('default is a plain value, and object() takes none', () => {
  expectTypeOf<() => string>().not.toExtend<StringConfig['default']>();
  expectTypeOf<() => unknown[]>().not.toExtend<ArrayConfig['default']>();
  expectTypeOf<ObjectConfig>().not.toHaveProperty('default');
  expectTypeOf<{ default: object }>().not.toExtend<
    Parameters<typeof object>[1]
  >();
});

test('number() takes no round option', () => {
  expectTypeOf<NumberConfig>().not.toHaveProperty('round');
});

test('min(), max(), minDate() and maxDate() take no exclusive argument', () => {
  expectTypeOf<Parameters<typeof min>['length']>().toEqualTypeOf<1 | 2>();
  expectTypeOf<Parameters<typeof max>['length']>().toEqualTypeOf<1 | 2>();
  expectTypeOf<Parameters<typeof minDate>['length']>().toEqualTypeOf<1 | 2>();
  expectTypeOf<Parameters<typeof maxDate>['length']>().toEqualTypeOf<1 | 2>();
  expectTypeOf<MinValidatorMessageParameters>().not.toHaveProperty('exclusive');
  expectTypeOf<MaxValidatorMessageParameters>().not.toHaveProperty('exclusive');
  expectTypeOf<MinDateValidatorMessageParameters>().not.toHaveProperty(
    'exclusive',
  );
  expectTypeOf<MaxDateValidatorMessageParameters>().not.toHaveProperty(
    'exclusive',
  );
});

const anyValue = async (value: unknown, field?: string) =>
  valid({ value, field });
const sameValue = async <T>(value: T, field?: string) =>
  valid({ value, field });

test('validation tests take the parsed value', () => {
  expectTypeOf(min(1, 'min')).toEqualTypeOf<
    Test<string | number | unknown[], never>
  >();
  expectTypeOf(
    check((value: { name: string }) => value.name !== '', 'empty'),
  ).toEqualTypeOf<Test<{ name: string }, never>>();

  // A test for another type doesn't fit, and neither does one whose valid
  // value is wider, since it goes on to the next test. A test that keeps any
  // value's type fits any type.
  const isTrue = createValidatorTest('true', (value: boolean) => value);
  expectTypeOf(isTrue).not.toExtend<Test<string, string>>();
  expectTypeOf(isTrue).toExtend<Test<boolean, string>>();
  expectTypeOf(anyValue).not.toExtend<Test<string, string>>();
  expectTypeOf(sameValue).toExtend<Test<string, string>>();
  string(min(1, 'min'), sameValue);
});

test('transform() keeps the type and takes only a synchronous function', () => {
  expectTypeOf(transform((value: string) => value.trim())).toEqualTypeOf<
    Test<string, never>
  >();
  expectTypeOf(string(transform((value) => value.trim()))).toEqualTypeOf<
    TypeValidator<string, string>
  >();

  // @ts-expect-error A transform that returns a promise is a type error.
  string(transform(async (value) => value));
  // @ts-expect-error So is one with an annotated parameter.
  transform(async (value: string) => value);
  object(
    {},
    // @ts-expect-error And one on a broad type, which a promise would fit.
    transform(async (value) => value),
  );
  // @ts-expect-error The same for unknown.
  transform(async (value: unknown) => value);
  // @ts-expect-error A transform can't change the type.
  string(transform((value) => value.length));
});

test('string() has no trim option', () => {
  // @ts-expect-error trim is gone; use transform((s) => s.trim()).
  string({ trim: true });
  expectTypeOf<StringConfig>().not.toHaveProperty('trim');
});

const annotated = (parameters: MinValidatorMessageParameters) =>
  `at least ${parameters.min}`;

test('messages get their extras with the value and field', async () => {
  min(1, (parameters) => {
    expectTypeOf(parameters.min).toEqualTypeOf<number>();
    expectTypeOf(parameters.amount).toEqualTypeOf<number | null | undefined>();
    expectTypeOf(parameters.value).toEqualTypeOf<
      string | number | unknown[] | null | undefined
    >();
    expectTypeOf(parameters.field).toEqualTypeOf<string | undefined>();
    return '';
  });

  // A message annotated with the exported parameters type still fits.
  min(1, annotated);

  // A message that reads params isn't a plain message, so invalid() takes
  // one only with its params, and a plain message reads value as unknown.
  type ExtrasMessage = (
    parameters: { count: number } & ValidatorMessageParameters<unknown>,
  ) => string;
  expectTypeOf<ExtrasMessage>().not.toExtend<ValidatorMessage<unknown>>();
  expectTypeOf<
    (parameters: ValidatorMessageParameters<string>) => string
  >().not.toExtend<ValidatorMessage<unknown>>();
  const withParams = await invalid({
    code: 'custom',
    message: ({ count }: { count: number }) => `count ${count}`,
    value: 1,
    field: undefined,
    params: { count: 1 },
  });
  assert.deepInclude(withParams, { message: 'count 1' });
});

type Signup = { password: string; confirm: string };
type Addresses = { billing: { zip: string }; shipping: { zip: string } };

test('check() types its errors from the path', () => {
  expectTypeOf(
    check(
      'confirm',
      (value: Signup) => value.confirm === value.password,
      'match',
      'Must match.',
    ),
  ).toEqualTypeOf<Test<Signup, { confirm?: Failure<never> }>>();
  expectTypeOf(
    check(
      ['shipping', 'zip'],
      (value: Addresses) => value.shipping.zip === value.billing.zip,
      'match',
      'Must match.',
    ),
  ).toEqualTypeOf<
    Test<Addresses, { shipping?: Failure<{ zip?: Failure<never> }> }>
  >();
  expectTypeOf(
    check(['password'], (value: Signup) => value.password !== '', 'empty'),
  ).toEqualTypeOf<Test<Signup, { password?: Failure<never> }>>();
});

test('check() infers the object and path inside object()', () => {
  expectTypeOf(
    object(
      { password: string(), confirm: string() },
      check(
        'confirm',
        (value) => value.confirm === value.password,
        'match',
        'Must match.',
      ),
    ),
  ).toEqualTypeOf<
    TypeValidator<
      Signup,
      { password?: Failure<string>; confirm?: Failure<string> }
    >
  >();
});

test('a failure carries its code and params', () => {
  expectTypeOf<Failure<unknown>['code']>().toEqualTypeOf<string>();
  expectTypeOf<Failure<unknown>['params']>().toEqualTypeOf<
    Record<string, unknown>
  >();
});

test('configs take messages, not requiredMessage', () => {
  expectTypeOf<StringConfig>().not.toHaveProperty('requiredMessage');
  expectTypeOf<NumberConfig>().not.toHaveProperty('requiredMessage');
  expectTypeOf<BooleanConfig>().not.toHaveProperty('requiredMessage');
  expectTypeOf<DateConfig>().not.toHaveProperty('requiredMessage');
  expectTypeOf<ArrayConfig>().not.toHaveProperty('requiredMessage');
  expectTypeOf<ObjectConfig>().not.toHaveProperty('requiredMessage');
  expectTypeOf<StringConfig['messages']>().toEqualTypeOf<
    Messages | undefined
  >();
  expectTypeOf<ObjectConfig['messages']>().toEqualTypeOf<
    Messages | undefined
  >();
});

test('message parameters have no limit key', () => {
  expectTypeOf<MinValidatorMessageParameters>().not.toHaveProperty('limit');
  expectTypeOf<MaxValidatorMessageParameters>().not.toHaveProperty('limit');
  expectTypeOf<ExactValidatorMessageParameters>().not.toHaveProperty('limit');
  expectTypeOf<MinDateValidatorMessageParameters>().not.toHaveProperty('limit');
  expectTypeOf<MaxDateValidatorMessageParameters>().not.toHaveProperty('limit');
});

test('a translation of the built-in codes needs every code', () => {
  expectTypeOf<{ min: string }>().not.toExtend<Messages<BuiltInCode>>();
  expectTypeOf<Record<BuiltInCode, string>>().toExtend<Messages<BuiltInCode>>();
  expectTypeOf<{ min: string }>().toExtend<Messages>();
  expectTypeOf<
    'min' | 'required' | 'type' | 'unknownKeys'
  >().toExtend<BuiltInCode>();
});

test('createValidatorTest() gives its params to the message', () => {
  createValidatorTest(
    'between',
    (value: number) => value > 1,
    (parameters) => {
      expectTypeOf(parameters.low).toEqualTypeOf<number>();
      expectTypeOf(parameters.value).toEqualTypeOf<number | null | undefined>();
      return '';
    },
    () => ({ low: 1 }),
  );
  // Without getParams, a message can't read params.
  expectTypeOf<
    (parameters: { low: number } & ValidatorMessageParameters<number>) => string
  >().not.toExtend<Parameters<typeof createValidatorTest<number>>[2]>();
});
