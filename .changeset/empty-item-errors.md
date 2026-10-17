---
'validator-fns': major
---

`array()` and `object()` record an empty string `''` for an item or field that fails with an empty message and no `errors`, instead of `undefined`. `null` still marks an array item that passed. Only custom validators can fail this way; the built-in tests always set a message.
