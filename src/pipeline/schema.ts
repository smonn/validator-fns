import { failure, propertiesTree } from '../failures/index.js';
import {
  hasOwnProperty,
  type Result,
  setOwn,
  type Validator,
  validResult,
} from '../shared.js';
import type { Shape } from './def.js';
import { runOf } from './twins.js';
import type { Run } from './promises.js';

/**
 * The value of an object's own property, or `undefined`, so a missing key named
 * like an inherited one, such as `constructor`, reads as missing.
 * @internal
 */
export function ownValue(value: object, key: string): unknown {
  return hasOwnProperty(value, key) ? Reflect.get(value, key) : undefined;
}

/**
 * Each property's key and its validator's run. Reads `schema` once, and throws
 * a `TypeError` naming a key whose value isn't a function.
 * @internal
 */
export function runsOf(
  schema: Record<string, Validator>,
): [key: string, run: Run<unknown, unknown>][] {
  const runs: [key: string, run: Run<unknown, unknown>][] = [];
  for (const [key, validator] of Object.entries(schema)) {
    if (typeof validator !== 'function') {
      throw new TypeError(`\`${key}\` must be a validator`);
    }
    runs.push([key, runOf(validator)]);
  }

  return runs;
}

/**
 * The object built from each property's value, or a `properties` failure
 * whose errors tree holds each failed property's.
 * @internal
 */
export function propertiesResult<V, Tree extends object>(
  results: [key: string, result: Result][],
  value: object,
  field: string | undefined,
  shape: Shape<V, Tree>,
): Result<V, Tree> {
  const values: Record<string, unknown> = {};
  for (const [key, result] of results) {
    if (result.state === 'invalid') {
      const errors = propertiesTree(results, shape.tree());
      return failure({ code: 'properties', params: {}, value, field, errors });
    }
    setOwn(values, key, result.value);
  }

  return validResult({ value: shape.value(values), field });
}
