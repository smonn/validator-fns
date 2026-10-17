import { expectTypeOf, test } from 'vitest';
import {
  applyArrayConfig,
  array,
  type ArrayConfig,
  type ArrayItemValidatorResult,
  boolean,
  createValidatorTest,
  date,
  invalid,
  min,
  number,
  object,
  required,
  string,
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
  expectTypeOf(number(required('required'))).toEqualTypeOf<
    ValidatorTest<number, string>
  >();
  expectTypeOf(boolean()).toEqualTypeOf<ValidatorTest<boolean, string>>();
  expectTypeOf(date()).toEqualTypeOf<ValidatorTest<Date, string>>();
});

test('built-in tests and results without errors have never as the error type', () => {
  expectTypeOf(required('required')).toEqualTypeOf<
    ValidatorTest<unknown, never>
  >();
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

test('object() maps each property to its value and error types', () => {
  expectTypeOf(object({ name: string(), age: number() })).toEqualTypeOf<
    ValidatorTest<
      { name?: string; age?: number },
      { name?: string; age?: string }
    >
  >();
});

test('array() carries the item value and error types', () => {
  expectTypeOf(array(string())).toEqualTypeOf<
    ValidatorTest<string[], string | ArrayItemValidatorResult<string>[]>
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
