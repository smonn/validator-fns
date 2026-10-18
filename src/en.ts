import { formatMessage } from './failures/index.js';
import type { BuiltInCode, Messages, ValidatorMessage } from './shared.js';

/**
 * A message for `min()`, `max()` or `exact()`, from the template for the
 * value's kind: `text` for a string's length, `list` for an array's, and
 * `number` for anything else.
 * @internal
 */
function byKind(
  number: string,
  text: string,
  list: string,
): ValidatorMessage<unknown, Record<string, unknown>> {
  return (parameters) => {
    const { value } = parameters;
    if (typeof value === 'string') {
      return formatMessage(text, parameters);
    }

    return formatMessage(typeof value === 'object' ? list : number, parameters);
  };
}

/**
 * English messages for every built-in code, for `withMessages()`. Compose
 * them with spread, such as `{ ...en, taken: 'Taken.' }`.
 * @category Helpers
 */
export const en: Messages<BuiltInCode> = Object.freeze({
  min: byKind(
    'Must be at least {min}.',
    'Must be at least {min} characters.',
    'Must have at least {min} items.',
  ),
  max: byKind(
    'Must be at most {max}.',
    'Must be at most {max} characters.',
    'Must have at most {max} items.',
  ),
  exact: byKind(
    'Must be exactly {exact}.',
    'Must be exactly {exact} characters.',
    'Must have exactly {exact} items.',
  ),
  minDate: 'Must be on or after {min}.',
  maxDate: 'Must be on or before {max}.',
  oneOf: 'Must be one of {values}.',
  matches: 'Must match {pattern}.',
  url: 'Must be a URL.',
  integer: 'Must be a whole number.',
  email: 'Must be an email address.',
  uuid: 'Must be a UUID.',
  required: 'Required.',
  type: 'Must be of type {expected}.',
  unknownKeys: 'Unknown keys: {keys}.',
  items: 'Has invalid items.',
  properties: 'Has invalid fields.',
});
