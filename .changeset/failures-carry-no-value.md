---
'validator-fns': major
---

Failures carry no `value`. An invalid result has `state`, `message`, `field` and `errors`, and in TypeScript `Failure` has no `value` key, so reading `result.value` needs `result.state === 'valid'` first. This also ends the difference where `array()` and `object()` returned the raw input as a failure's `value` while other validators returned the parsed value (#685).

Messages still get `value`. `invalid()` takes `value` as optional and uses it only to format the message.
