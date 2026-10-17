---
'validator-fns': patch
---

`min()`, `max()` and `exact()` now pass a number as `amount` to their messages for every value, as their message types say. A value that was neither a string, an array nor a number, such as a `Date`, used to be passed as is.
