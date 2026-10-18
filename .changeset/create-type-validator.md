---
'validator-fns': major
---

Adds `createTypeValidator(parser)`, which makes a custom validation type from any validator as its parser. It returns a function with the validation types' call shape, `(config?, ...tests)`, whose config takes `default` and `messages`. The parser reads present input only, a parsed `undefined` or `null` counts as missing, and its failure keeps its own code, params, message and errors, which `messages` words when it has no message. `createTypeValidator(string(uuid()))()` fails `42` with `type` and `'nope'` with `uuid`.

`createTypeValidatorTest()` is removed, and so is the `parser` option of `string()`, `number()`, `boolean()`, `date()` and `array()`. Make a custom type with `createTypeValidator(parser)` instead, and do in its tests what `applyConfig` did.
