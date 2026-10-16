---
'validator-fns': patch
---

Type validators such as `string()` and `number()`, and validators built with `createTypeValidatorTest`, no longer cache results by value. The cache had no size limit, so memory grew with every distinct value, and a repeated value returned the first call's `field`.

Custom tests now run on every call, including for a repeated value. If a custom test does expensive work, such as a server lookup, memoize it in the test.
