---
'validator-fns': patch
---

`optional()` of a Proxy of a type validator, or of a function with a type validator's properties assigned, now runs that wrapper. It used to run the type validator in its place.
