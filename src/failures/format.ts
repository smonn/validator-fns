import type { ValidatorMessage } from '../types.js';
import { ownData, parametersOf } from './own.js';

/** @internal */
const formatPattern = /{(\w+)}/g;

/**
 * What `read` gives for `value`, or `undefined` when it throws.
 * @internal
 */
function attempt(
  read: (value: unknown) => string,
  value: unknown,
): string | undefined {
  try {
    return read(value);
  } catch {
    return undefined;
  }
}

/**
 * A value as text for a message template. Input such as `Object.create(null)`
 * or a boxed symbol has no string form, so it reads as its tag, such as
 * `[object Object]`, and a revoked Proxy, which has no tag either, as its
 * `typeof`: wording a template never throws.
 * @internal
 */
function toText(value: unknown): string {
  return (
    attempt(String, value) ??
    attempt((tagged) => Object.prototype.toString.call(tagged), value) ??
    `[${typeof value}]`
  );
}

/**
 * Formats a squiggly bracket `{}` template. A `{name}` reads only an own data
 * property of `parameters`, so `{constructor}` isn't read from the prototype.
 * @internal
 */
export function formatMessage(template: string, parameters: object): string {
  return template.replaceAll(formatPattern, (_, key: string) =>
    toText(ownData(parameters, key)),
  );
}

/**
 * A failure's message, from a template or a function, with the parameters
 * `parametersOf()` copies. A function that returns anything but a string is
 * a bug, so it throws a `TypeError` naming the code (ADR 0001).
 * @internal
 */
export function wordMessage<T, P extends Record<string, unknown>>(
  code: string,
  message: ValidatorMessage<T, P>,
  params: P,
  value: T | null | undefined,
  field: string | undefined,
): string {
  const parameters = parametersOf(params, value, field);
  if (typeof message === 'string') {
    return formatMessage(message, parameters);
  }

  const worded: unknown = message(parameters);
  if (typeof worded !== 'string') {
    throw new TypeError(`The message for \`${code}\` must return a string`);
  }
  return worded;
}
