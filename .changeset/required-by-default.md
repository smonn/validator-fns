---
'validator-fns': major
---

**Type validators are required by default.** `string()`, `number()`, `boolean()`, `date()`, `array()`, `object()` and validators made with `createTypeValidatorTest` reject a missing value with `'Required.'`. A missing value is `undefined`, `null`, an empty string, `NaN` or an invalid date, after parsing and `default`. `required()` is removed. Wrap a validator in the new `optional()` to accept a missing value again.

Migration:

- Move each `required(message)` into the config as `requiredMessage`: `string(required('Enter a name.'), min(2, '…'))` becomes `string({ requiredMessage: 'Enter a name.' }, min(2, '…'))`. Merge it into an existing config object: `number({ round: 'floor' }, required('…'))` becomes `number({ round: 'floor', requiredMessage: '…' })`. For `array()`, put the item validator after the config: `array(string(), required('…'))` becomes `array({ requiredMessage: '…' }, string())`.
- Wrap every validator that had no `required()` in `optional()`: `string(email('…'))` becomes `optional(string(email('…')))`. Otherwise it now rejects a missing value. A missing value skips the tests, as before.
- `required(message, true)` (nullable) has no direct replacement. `optional()` accepts `null` and every other missing value.
- `object()`'s second argument is a config object or the first object-level test: `object(properties, { requiredMessage }, ...tests)`. A missing object now fails with its `requiredMessage` instead of reporting each field as missing.
- `optional()` on a custom validator accepts `undefined` and `null` and passes every other value to it.

Types follow the runtime:

- A valid result's `value` is `T`, and `null | undefined` only for `optional()` validators. `valid()` takes a `value` of type `T`.
- `object()` makes a key optional only when its validator's value type includes `undefined`, as `optional()`'s does: `object({ name: string(), age: optional(number()) })` is typed `{ name: string; age?: number | null | undefined }`. This replaces the `{ name?: string | null }` typing from 3.0.0-next.1.
- A field's error type in `object()` includes `string`, since a nested object or array that fails with a message, such as `'Required.'`, records that message.
- `standard()`'s output type is the validator's value type, without `null | undefined` added.
