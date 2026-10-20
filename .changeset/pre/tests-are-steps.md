---
'validator-fns': major
---

Tests are steps: type validators and `object()` run their tests in order, each test's valid value goes to the next, and the last one is the result's value. A custom test that resolves to `valid()` with a different value now changes the value. `Test<T, E>` resolves to `Result<T, E>`, so a step keeps the type, and `min()`, `max()` and `exact()` take their type from the validator they're passed to. `array()`'s tests still only check, for now.

Adds `transform(fn)`, a test that changes the value with a synchronous `fn` and never fails. `string()`'s `trim` option is removed: use `transform((s) => s.trim())`. A trimmed value isn't checked for missing again, so `'  '` becomes `''` for the next tests instead of failing with `required`.
