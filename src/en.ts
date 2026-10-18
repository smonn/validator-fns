import { amount } from './en-amount.js';
import type { BuiltInCode, Messages } from './shared.js';

/**
 * English messages for every built-in code, for `withMessages()`. Compose
 * them with spread, such as `{ ...en, taken: 'Taken.' }`.
 * @category Helpers
 */
export const en: Readonly<Messages<BuiltInCode>> = Object.freeze({
  min: amount('at least', 'min'),
  max: amount('at most', 'max'),
  exact: amount('exactly', 'exact'),
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
