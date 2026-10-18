import { childField, failure, propertiesTree } from '../failures/index.js';
import {
  hasOwnProperty,
  type Result,
  setOwn,
  type Validator,
  validResult,
} from '../shared.js';
import { runEach } from './children.js';
import { andThen, type MaybePromise, type Run } from './steps.js';
import { runOf } from './define.js';

/**
 * How `object()` types its errors tree, made fresh for each failure, and its
 * value from the properties' values.
 * @internal
 */
type Shape<V, Tree> = {
  tree: () => Tree;
  value: (values: Record<string, unknown>) => V;
};

/**
 * The value of an object's own property, or `undefined`, so a missing key named
 * like an inherited one, such as `constructor`, reads as missing.
 * @internal
 */
function ownValue(value: object, key: string): unknown {
  return hasOwnProperty(value, key) ? Reflect.get(value, key) : undefined;
}

/**
 * The object built from each property's value, or a `properties` failure
 * whose errors tree holds each failed property's.
 * @internal
 */
function propertiesResult<V, Tree extends object>(
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

/**
 * Runs each property's validator on the object's own value for its key, with
 * the key's full field. Reads `schema` once, and throws a `TypeError` naming a
 * key whose value isn't a function.
 * @internal
 */
export function properties<V, Tree extends object>(
  schema: Record<string, Validator>,
  shape: Shape<V, Tree>,
): (value: object, field: string | undefined) => MaybePromise<Result<V, Tree>> {
  const runs: [key: string, run: Run<unknown, unknown>][] = [];
  for (const [key, validator] of Object.entries(schema)) {
    if (typeof validator !== 'function') {
      throw new TypeError(`\`${key}\` must be a validator`);
    }
    runs.push([key, runOf(validator)]);
  }

  return (value, field) => {
    const results = runEach(runs.entries(), ([key, run]) => {
      const result = run(ownValue(value, key), childField(field, key));
      return andThen(result, (done): [string, Result] => [key, done]);
    });
    return andThen(results, (done) =>
      propertiesResult(done, value, field, shape),
    );
  };
}
