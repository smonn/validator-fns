import { type Validator, validResult } from '../shared.js';
import { isMissing } from './def.js';
import { type TypeValidator, withStandard } from './standard.js';
import { optionalOf } from './define.js';

/**
 * Lets a type validator accept a missing value, `undefined` or `null`, that
 * `default` doesn't fill and `object()` can't build. A missing value skips
 * the parser and the tests, and is the result's value as it is. Any other
 * validator, such as a custom one, gets `undefined` and `null` accepted the
 * same way, and every other value passed on.
 * @category Helpers
 */
export function optional<T, E>(
  validator: Validator<T, E>,
): TypeValidator<T | null | undefined, E> {
  return (
    optionalOf(validator) ??
    withStandard(async (value?: unknown, field?: string) =>
      isMissing(value)
        ? validResult<T | null | undefined, E>({ value, field })
        : validator(value, field),
    )
  );
}
