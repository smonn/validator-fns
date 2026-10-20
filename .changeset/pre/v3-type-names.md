---
'validator-fns': major
---

Renames the result and validator types, with no aliases for the old names:

| Before            | After       |
| :---------------- | :---------- |
| `ValidatorResult` | `Result`    |
| `ValidResult`     | `Valid`     |
| `InvalidResult`   | `Failure`   |
| `ValidatorTest`   | `Validator` |
| `ValidationTest`  | `Test`      |

Only the names change. The types and `state`'s `'valid' | 'invalid'` stay the same.
