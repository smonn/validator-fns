---
'validator-fns': major
---

`string()` and `number()` return an invalid result for arrays, Maps, Sets, functions, RegExps, plain objects, other non-primitive objects, and symbols, instead of coercing them (`[1]` used to pass `string()` as `"1"` and `number()` as `1`). Dates and `String`, `Number`, or `Boolean` objects are still accepted. `parseString` and `parseNumber` throw a `TypeError` for the same input.
