import { formatMessage } from './failures/index.js';
import type { ValidatorMessage } from './shared.js';

/**
 * The message for `min()`, `max()` or `exact()`, such as `Must be at least
 * {min}.`, which words a string's length as characters and an array's as
 * items.
 * @param bound How the amount compares, such as `at least`
 * @param limit The param with the limit, such as `min`
 * @internal
 */
export function amount(
  bound: string,
  limit: string,
): ValidatorMessage<unknown, Record<string, unknown>> {
  return (parameters) => {
    const { value } = parameters;
    const unit = typeof value === 'string' ? ' characters' : '';
    return formatMessage(
      typeof value === 'object'
        ? `Must have ${bound} {${limit}} items.`
        : `Must be ${bound} {${limit}}${unit}.`,
      parameters,
    );
  };
}
