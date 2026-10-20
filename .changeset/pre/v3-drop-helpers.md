---
'validator-fns': major
---

Removes the helper exports, the `round` option and the `exclusive` argument:

- `applyArrayConfig`, `applyBooleanConfig`, `applyDateConfig`, `applyNumberConfig`, `applyStringConfig`, `parseArray`, `parseBoolean`, `parseNumber`, `parseString`, `parseDate`, `invalidDate`, `hasOwnProperty`, `isObject` and `formatMessage` are no longer exported. Parse with the type validator, such as `number()`, and let `invalid()` and `createValidatorTest()` format messages.
- The types `DeepPartial`, `ValidatorFactory`, `SharedValueType`, `SharedDateValueType` and `ConfigBase` are no longer exported. A `createTypeValidatorTest()` config type declares `parser` and its options itself.
- `number()` no longer takes `round`. Use `integer()`, which rejects a number that isn't an integer.
- `min()`, `max()`, `minDate()` and `maxDate()` no longer take `exclusive`, and their messages no longer get it. Write a strict bound with `check()`, such as `check((value) => value > 0, 'Must be positive.')`.
