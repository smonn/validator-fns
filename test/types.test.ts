import { expectTypeOf, test } from 'vitest';
import type {
  Failure,
  InvalidResult,
  Result,
  Valid,
  ValidResult,
  Validator,
  ValidatorResult,
  ValidatorTest,
} from '../src/index.js';

test('should equal ValidatorResult when using Result', () => {
  expectTypeOf<Result>().toEqualTypeOf<ValidatorResult>();
  expectTypeOf<Result<string, number>>().toEqualTypeOf<
    ValidatorResult<string, number>
  >();
});

test('should equal ValidResult when using Valid', () => {
  expectTypeOf<Valid<string>>().toEqualTypeOf<ValidResult<string>>();
});

test('should equal InvalidResult when using Failure', () => {
  expectTypeOf<Failure<number>>().toEqualTypeOf<InvalidResult<number>>();
});

test('should equal ValidatorTest when using Validator', () => {
  expectTypeOf<Validator>().toEqualTypeOf<ValidatorTest>();
  expectTypeOf<Validator<string, number>>().toEqualTypeOf<
    ValidatorTest<string, number>
  >();
});
