import type { Run } from './promises.js';

/**
 * How many type validators' runs, built-in or custom, are running one inside
 * another, as a schema's children or a recursive schema's custom validator
 * calling the schema.
 * @internal
 */
let nesting = 0;

// Past this nesting, a run starts on a later microtask, unwinding the stack.
const maxNesting = 100;

/**
 * Guards a type validator's run, so a run nested past `maxNesting` starts on a
 * later microtask instead, however the schema nests.
 * @internal
 */
export function guardRun<T, E>(run: Run<T, E>): Run<T, E> {
  const guarded: Run<T, E> = (value, field) => {
    if (nesting >= maxNesting) {
      return Promise.resolve().then(() => guarded(value, field));
    }
    nesting += 1;
    try {
      return run(value, field);
    } finally {
      nesting -= 1;
    }
  };
  return guarded;
}
