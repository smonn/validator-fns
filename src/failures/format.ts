import type {
  ValidatorMessage,
  ValidatorMessageParameters,
} from '../shared.js';

/** @internal */
const formatPattern = /{(\w+)}/g;

/**
 * Formats a message using a squiggly bracket `{}` template.
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
      String(Reflect.get(parameters, key)),
    );
  }

  return template(parameters);
}
