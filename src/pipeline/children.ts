import { afterPromise, isThenable, type MaybePromise } from './promises.js';

/**
 * Runs each child in order, sync until one returns a promise, and gives every
 * child's result. Reads the children by index, not through an array's own
 * `values()` or `entries()`, and a run that goes async resumes at the next.
 * @internal
 */
export function runEach<A extends readonly unknown[], R extends object>(
  children: A,
  runOne: (child: A[number], index: number) => MaybePromise<R>,
  results: R[] = [],
): MaybePromise<R[]> {
  for (let index = results.length; index < children.length; index += 1) {
    const result = runOne(children[index], index);
    if (isThenable(result)) {
      return afterPromise(result, (done) => {
        results.push(done);
        return runEach(children, runOne, results);
      });
    }
    results.push(result);
  }

  return results;
}
