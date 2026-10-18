import type { ConfigBase, Test, Validator } from '../types.js';
import { configAndTests } from './config.js';
import { type Def, keepValue, type Parser } from './def.js';
import { defineType, runOf } from './twins.js';
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
function typeFactory<T, E>(
  parser: Parser<T, E> & Pick<Def<T, E, T>, 'coerce'>,
): TypeFactory<T, E> {
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
 * Whether a value is blank text: empty, or only the whitespace `trim()`
 * removes.
 * @internal
 */
function isBlank(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === '';
}

/**
 * Makes the factory of a built-in scalar type validator, which accepts a value
 * of its own type as it is and fails any other with a `type` failure with the
 * `expected` type. `isType` defaults to a `typeof` check for `expected`. With
 * `read`, it makes the coerce twin: blank text is missing, and `read` gives
 * the value to validate in place of any other input.
 * @internal
 */
export function defineScalar<T>(
  expected: string,
  isType = (value: unknown): value is T => typeof value === expected,
  read?: (input: unknown) => unknown,
): TypeFactory<T, string> {
  const coerce =
    read === undefined
      ? undefined
      : (input: unknown) => (isBlank(input) ? undefined : read(input));
  return typeFactory({ isType, expected, coerce });
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
