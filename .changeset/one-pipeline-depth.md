---
'validator-fns': patch
---

A recursive schema, whose custom validator calls the schema again, now validates input nested to any depth. It used to reject with a `RangeError` past about 2,300 levels of `object()`.
