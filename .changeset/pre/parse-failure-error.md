---
'validator-fns': minor
---

Add `parse(validator, value, field?)`, which resolves to the parsed value or rejects with a `FailureError` for invalid input. A `FailureError`'s `failure` is the whole failure with its errors tree, and its `message` has a `field: message` line for each leaf. A bug still rejects with its thrown value unwrapped, so `instanceof FailureError` tells a failure from a bug.
