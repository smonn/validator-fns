---
'validator-fns': patch
---

`object()` keeps a schema key named `__proto__` as an own property of `value` and `errors`. It used to drop a string or `null` result, and an object result became the prototype of the returned value.
