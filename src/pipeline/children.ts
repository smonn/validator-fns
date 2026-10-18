import { isThenable, type MaybePromise } from './steps.js';

/**
 * Runs each child in order, sync until one returns a promise, and gives every
 * child's result. Takes an iterator, so a run that goes async resumes where it
 * left off.
 * @internal
 */
export function runEach<C, R extends object>(
  children: Iterator<[index: number, child: C]>,
  runOne: (child: C, index: number) => MaybePromise<R>,
  results: R[] = [],
): MaybePromise<R[]> {
  for (let next = children.next(); !next.done; next = children.next()) {
    const result = runOne(next.value[1], next.value[0]);
    if (isThenable(result)) {
      return result.then((done) => {
        results.push(done);
        return runEach(children, runOne, results);
      });
    }
    results.push(result);
  }

  return results;
}
