import {
  hasOwnProperty,
  type ValidatorMessage,
  type ValidatorMessageParameters,
} from '../shared.js';

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
 * `typeof`: wording a failure never throws.
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
 * Formats a message using a squiggly bracket `{}` template. A `{name}` reads
 * only an own parameter, so `{constructor}` isn't read from the prototype.
 * @param template Message template as string or function
 * @param parameters Params to inject into template
 * @internal
 */
export function formatMessage<T, X extends object = object>(
  template: ValidatorMessage<T, X>,
  parameters: X & ValidatorMessageParameters<T>,
): string {
  if (typeof template === 'string') {
    return template.replaceAll(formatPattern, (_, key: string) =>
      toText(
        hasOwnProperty(parameters, key)
          ? Reflect.get(parameters, key)
          : undefined,
      ),
    );
  }

  return template(parameters);
}
