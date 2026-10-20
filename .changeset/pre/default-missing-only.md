---
'validator-fns': major
---

`default` fills only missing input, `undefined` or `null`: `string({ default })` no longer replaces `''`, and `array({ default })` no longer replaces `[]`. The default skips the parser, and the tests run on it.

`object()` builds a missing object from its properties, as 2.x did: each property's validator runs on `undefined`, and when every one is valid, the built object is the value and the collection tests run on it. Otherwise the object fails with `required`, and `optional()` of it gives the missing value. An object whose properties all accept a missing value, such as `object({})`, now accepts one, and its collection tests run on the built object inside `optional()` too: `optional(object({ email: optional(string()), phone: optional(string()) }, check((value) => value.email !== undefined || value.phone !== undefined, 'contact')))` now fails a missing object with `contact`. Let the check pass an object whose fields are all `undefined` to accept a missing one.
