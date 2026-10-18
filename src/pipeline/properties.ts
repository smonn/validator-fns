import { childField } from '../failures/index.js';
import type { Result } from '../shared.js';
import { runEach } from './children.js';
import type { Shape } from './def.js';
import { andThen, type MaybePromise } from './promises.js';
import { ownValue, propertiesResult, type Runs } from './schema.js';

/**
 * Runs each property's validator on the object's own value for its key, with
 * the key's full field.
 * @internal
 */
export function properties<V, Tree extends object>(
  runs: Runs,
  shape: Shape<V, Tree>,
): (value: object, field: string | undefined) => MaybePromise<Result<V, Tree>> {
  return (value, field) => {
    const results = runEach(runs, ([key, run]) => {
      const result = run(ownValue(value, key), childField(field, key));
      return andThen(result, (done): [string, Result] => [key, done]);
    });
    return andThen(results, (done) =>
      propertiesResult(done, value, field, shape),
    );
  };
}
