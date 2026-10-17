---
'validator-fns': major
---

Type changes that replace `any` with checked types:

- `ValidatorTest` and `ValidatorResult` default their value and error types to `unknown` instead of `any`. Code that reads `value` or `errors` from an untyped result now needs a type argument or a check.
- `createValidatorTest` defaults its value type to `unknown` and its error type to `never`, so a message function's `value` is `unknown` unless you pass a type argument.
- Validators made with `createTypeValidatorTest`, including `string`, `number`, `boolean` and `date`, only accept tests whose `errors` type is `string`. The built-in tests and `invalid()` without `errors` now have the error type `never`, so they still fit.
