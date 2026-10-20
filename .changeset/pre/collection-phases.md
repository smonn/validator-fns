---
'validator-fns': major
---

`array()` and `object()` run in three phases. The built-in `min()`, `max()` and `exact()` passed to `array()` check the length before any item runs, wherever they come among the tests, and a failure is the result. Every item or property then runs, even after one fails. The remaining tests, collection tests, run only once every child is valid. `array()`'s collection tests now take the parsed items, typed `Test<T[]>`, and pass their values on, so a test's valid value is the array's value. A `min()` wrapped in a test of your own runs after the items.

Adds `object(schema, { strict: true })`, which fails keys outside the schema with the `unknownKeys` code and `{ keys }` before any property runs. `BuiltInCode` includes `unknownKeys`. Without `strict`, unknown keys are still left out of the value.
