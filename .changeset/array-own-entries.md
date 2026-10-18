---
'validator-fns': patch
---

`array()` now validates the items of an array with its own `entries` property. It used to validate what that property returned, or reject when it wasn't a function.
