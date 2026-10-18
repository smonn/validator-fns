---
'validator-fns': minor
---

Add `withMessages(validator, messages)`, which binds a translation to a whole validator tree, and `validator-fns/en`, which exports `en`, English messages for every built-in code. After each run, `withMessages()` words each failure made without a message by its code, so a message passed to a test or set in a `messages` config, and an inner `withMessages()`, win. Its results and `~standard` carry the messages, and `optional()` works around it in either order. Compose translations with spread, such as `{ ...en, taken: 'Taken.' }`.

Each `properties` failure on a `check()` path now gets the value at its level for its message. A message template no longer throws for a value without a string form, such as `Object.create(null)`, which reads as its tag, and a `{name}` placeholder reads only the parameters' own keys.
