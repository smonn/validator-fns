---
'validator-fns': major
---

Every type validator now runs through one pipeline that stays synchronous until a test or child returns a promise. A recursive schema, whose custom validator calls the schema again, now rejects with a `RangeError` for input nested deeper than about 650 levels of `array()` or 1,500 of `object()` on Node 22's default stack. A custom validator that awaits before it recurses has no such limit.
