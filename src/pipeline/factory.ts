import type { ConfigBase, Test, Validator } from '../shared.js';
import { configAndTests } from './config.js';
import { keepValue, type Parser } from './def.js';
import { defineType, runOf } from './define.js';
import type { TypeValidator } from './standard.js';

/**
 * A type validator's call shape: an optional config, or the first of the
 * tests, then the tests.
 * @internal
 */
type TypeFactory<T, E> = (
  config?: Partial<ConfigBase<T>> | Test<T, E>,
  ...tests: Test<T, E>[]
) => TypeValidator<T, E>;

/**
 * Makes the factory of a type validator without children, which reads input
 * with `parser`.
 * @internal
 */
function typeFactory<T, E>(parser: Parser<T, E>): TypeFactory<T, E> {
  return (first, ...rest) => {
    const { config, tests } = configAndTests(first, rest);
    return defineType<T, E, T>({
      ...parser,
      default: config.default,
      messages: config.messages,
      gate: [],
      children: keepValue,
      steps: tests,
    });
  };
}

/**
 * Makes the factory of a built-in scalar type validator, which accepts a value
 * of its own type as it is and fails any other with a `type` failure with the
 * `expected` type. `isType` defaults to a `typeof` check for `expected`.
 * @internal
 */
export function defineScalar<T>(
  expected: string,
  isType = (value: unknown): value is T => typeof value === expected,
): TypeFactory<T, string> {
  return typeFactory({ isType, expected });
}

/**
 * Makes a custom type validator from a parser, which can be any validator. It
 * reads present input, and its failure is the type validator's own, with its
 * code, params and errors. The type validator adds the missing check,
 * `default`, `messages`, the tests and `optional()`. A parser that isn't a
 * function throws a `TypeError`.
 * @param parser Validator that reads the input into the type
 * @category Helpers
 */
export function createTypeValidator<T, E>(
  parser: Validator<T | null | undefined, E>,
): TypeFactory<T, E> {
  if (typeof parser !== 'function') {
    throw new TypeError('`parser` must be a validator');
  }

  return typeFactory({ parser: runOf(parser) });
}
