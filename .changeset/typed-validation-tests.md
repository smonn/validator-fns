---
'validator-fns': major
---

Validation tests take the value type they check, and messages are typed by their extra parameters.

- The new `ValidationTest<T, E>` type is a test that takes a value of type `T`. Built-in tests and `check()` return it, `ValidatorFactory` and the validation types take it, and `createValidatorTest`'s callback gets `T` instead of `unknown`. A test on another type, such as a boolean test passed to `string()`, is a type error. A custom test that takes `unknown` still fits every validation type.
- Built-in tests called directly with `null` or `undefined` fail instead of passing them through, and an empty string is checked like any other string, so `min(1, …)('')` fails. Validation types never pass these to tests, so validators behave as before.
- `ValidatorMessage<T, X>` takes the extra message parameters `X` instead of the whole parameter type. Each test's exported `*MessageParameters` type keeps its meaning, and a message annotated with it still fits.
- `invalid()` gives a message function `value` as `unknown`, and needs `extras` when the message reads extra parameters. `formatMessage` takes the extras type as its second type parameter.
