import { coerceBoolean } from './booleans.js';
import { coerceDate } from './dates.js';
import { coerceNumber } from './numbers.js';

/**
 * Coerce twins of `number()`, `boolean()` and `date()`, for text such as form
 * fields and query strings. Each reads its input before the missing check:
 * blank text is missing, and input it can't read passes on as it is, so the
 * built-in fails it with `type`.
 * @category Type Validators
 */
export const coerce = {
  number: coerceNumber,
  boolean: coerceBoolean,
  date: coerceDate,
};
