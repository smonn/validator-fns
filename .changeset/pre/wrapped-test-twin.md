---
'validator-fns': patch
---

A Proxy of a built-in test, or a function with a built-in test's properties assigned, now runs as itself when a type validator runs its tests. It used to run the built-in test in its place.
