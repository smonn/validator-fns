---
'validator-fns': major
---

`object()` throws a `TypeError` naming the key when a schema property isn't a validator, when the validator is built, instead of failing that field with `'No validator set'` on every call.
