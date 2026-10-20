---
'validator-fns': major
---

Every failure carries a `code`, such as `min`, `required` or `type`, and `params`, such as `{ min, amount }`, beside its `message`. Messages are optional on every built-in test, and core ships no English: a failure without a message reads its code, so `'Required.'` is now `'required'` and `'Failed to parse value to number.'` is `'type'` with `{ expected: 'number' }`.

A type validator's `messages` config, keyed by code, replaces `requiredMessage` and words the validator's own failures: `required`, `type`, `items`, `properties` and its tests' codes. A message passed to a test wins over it, and it doesn't word an array's items or an object's fields.

Custom failures name their code: `createValidatorTest(code, test, message?, getParams?)`, `check(path?, test, code, message?)` and `invalid({ code, params?, message?, value?, field, errors? })`, where `params` replaces `extras`. The `limit` message key is gone from `min()`, `max()`, `exact()`, `minDate()` and `maxDate()`, and `email()` and `uuid()` no longer pass their pattern. `Messages` and `BuiltInCode` are exported.

Standard Schema issues carry `code` and `params`, and an `array()` or `object()` whose children failed reports only their issues. The `'Invalid value.'` fallback is gone.
