import { childField, failure, itemsTree } from '../failures/index.js';
import {
  type Failure,
  type Result,
  type Validator,
  validResult,
} from '../shared.js';
import { runEach } from './children.js';
import type { Children } from './def.js';
import { isThenable } from './steps.js';
import { runOf } from './define.js';

/**
 * The items as the item validator parsed them, or an `items` failure whose
 * errors tree holds each item's.
 * @internal
 */
function itemsResult<T, E>(
  results: Result<T, E>[],
  value: unknown[],
  field: string | undefined,
): Result<T[], (Failure<E> | null)[]> {
  const values: T[] = [];
  for (const result of results) {
    if (result.state === 'invalid') {
      const errors = itemsTree(results);
      return failure({ code: 'items', params: {}, value, field, errors });
    }
    values.push(result.value);
  }

  return validResult({ value: values, field });
}

/**
 * Runs the item validator on every item, with the item's full field.
 * @internal
 */
export function items<T, E>(
  item: Validator<T, E>,
): Children<unknown[], T[], (Failure<E> | null)[]> {
  const run = runOf(item);
  return (value, field) => {
    const results = runEach(value.entries(), (child, index) =>
      run(child, childField(field, index)),
    );
    return isThenable(results)
      ? results.then((done) => itemsResult(done, value, field))
      : itemsResult(results, value, field);
  };
}
