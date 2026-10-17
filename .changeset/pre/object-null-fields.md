---
'validator-fns': major
---

`object()`'s value type includes `null` for each field, as in `{ name?: string | null }`, matching what it returns for a `null` field. Code that read those fields as non-null now needs a `null` check.
