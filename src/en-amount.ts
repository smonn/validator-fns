import { formatMessage } from './failures/index.js';
import type { ValidatorMessage } from './shared.js';

/**
 * Whether `value` is an array. A revoked Proxy, on which `Array.isArray`
 * throws, isn't.
 * @internal
 */
function isList(value: unknown): boolean {
  try {
    return Array.isArray(value);
  } catch {
    return false;
  }
}

/**
 * The message for `min()`, `max()` or `exact()`, such as `Must be at least
 * {min}.`, which words a string's length in characters and an array's in
 * items, singular for a limit of 1.
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
    const plural = parameters[limit] === 1 ? '' : 's';
    if (typeof value === 'string') {
      return formatMessage(
        `Must be ${bound} {${limit}} character${plural}.`,
        parameters,
      );
    }
    if (isList(value)) {
      return formatMessage(
        `Must have ${bound} {${limit}} item${plural}.`,
        parameters,
      );
    }

    return formatMessage(`Must be ${bound} {${limit}}.`, parameters);
  };
}
