---
'validator-fns': major
---

`array()` takes its item validator first: `array(item, config?, ...tests)`, as `object(properties, config?, ...tests)` does. Change `array(config, item, ...tests)` to `array(item, config, ...tests)`. `array(config?)` without an item validator still works and keeps the items as they are. Passing the config first with an item validator throws a `TypeError`.

`object()` takes one type parameter, the schema, instead of three. Its inferred value and error types are unchanged; explicit type arguments such as `object<Schema, Value, Errors>(…)` become `object<Schema>(…)`.
