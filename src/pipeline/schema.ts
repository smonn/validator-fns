import { failure, propertiesTree } from '../failures/index.js';
import type { Result, Validator } from '../types.js';
import { validResult } from '../results.js';
import type { Shape } from './def.js';
import { runOf } from './twins.js';
import type { Run } from './promises.js';

/**
 * The value of an object's own property, or `undefined`, so a missing key named
 * like an inherited one, such as `constructor`, reads as missing.
 * @internal
 */
export function ownValue(value: object, key: string): unknown {
  return Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined;
}

/**
 * Each property's key and its validator's run, read from the schema once.
 * @internal
 */
export type Runs = readonly [key: string, run: Run<unknown, unknown>][];

/**
 * The runs of a schema's properties. Reads `schema` once, so the strict-keys
 * gate and the children take the same keys, and throws a `TypeError` naming a
 * key whose value isn't a function.
 * @internal
 */
export function runsOf(schema: Record<string, Validator>): Runs {
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
  const values: [key: string, value: unknown][] = [];
  for (const [key, result] of results) {
    if (result.state === 'invalid') {
      const errors = propertiesTree(results, shape.tree());
      return failure({ code: 'properties', params: {}, value, field, errors });
    }
    values.push([key, result.value]);
  }

  return validResult({ value: shape.value(Object.fromEntries(values)), field });
}
