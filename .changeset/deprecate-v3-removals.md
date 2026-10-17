---
'validator-fns': minor
---

New `Result`, `Valid`, `Failure` and `Validator` types are the v3 names for `ValidatorResult`, `ValidResult`, `InvalidResult` and `ValidatorTest`. Everything v3 removes is now deprecated, and each deprecation names its replacement: the helper exports, `required()`, `standard()`, the `parser`, `round` and `trim` options, the `exclusive` argument, the `limit` message parameter and the old type names. Nothing changes at runtime. The README's new Deprecations section lists them all.
