---
'validator-fns': major
---

A throw from your code now rejects from every validator, with the thrown value as it is. In 2.x, `string()`, `number()`, `boolean()`, `date()` and `createTypeValidatorTest()` validators turned a throw from a test, a `requiredMessage` function or a `parser` into an invalid result with the error's message, while `array()` and `object()` rejected. Input a validator can't read still gives an invalid result.

A custom `parser` returns a result instead of the value: `valid({ value, field })`, or `invalid({ message, field })` for input it can't read, instead of throwing. It gets the field name as its second argument. `createTypeValidatorTest()` runs the config's `parser` itself, so `applyConfig` gets the parsed value instead of calling `config.parser`.
