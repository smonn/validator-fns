---
'validator-fns': minor
---

Adds `coerce.number()`, `coerce.boolean()` and `coerce.date()`, which read text such as form fields and query strings, then validate what they read as `number()`, `boolean()` and `date()` do, with the same `(config?, ...tests)`. Each reads its input before the missing check, so blank text (`''` or only whitespace) is missing: it fails with `required`, takes the `default`, or is valid `undefined` inside `optional()`. `coerce.number()` reads trimmed decimal text, `coerce.boolean()` reads `true`/`false`, `1`/`0` and `on`/`off` in any case, and `coerce.date()` reads ISO 8601 text and timestamps. Text a twin can't read, such as `'12px'` or `'yes'`, fails with `type`, as in the strict built-in.
