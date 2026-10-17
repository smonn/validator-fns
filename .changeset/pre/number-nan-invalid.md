---
'validator-fns': major
---

`number()` returns an invalid result (`Failed to parse value to number.`) for non-blank input it can't read as a number, such as `'abc'` or `true`, instead of a valid `NaN`. A blank string still gives `NaN`, which `required()` treats as empty and the `default` option replaces. `parseNumber` throws a `TypeError` for the same input.
