---
'validator-fns': major
---

Type validators are [Standard Schemas](https://standardschema.dev) themselves, and `createValidator(fn)` replaces `standard()`.

- `string()`, `number()`, `boolean()`, `date()`, `array()`, `object()`, validators made with `createTypeValidatorTest`, and every validator `optional()` returns carry `~standard`. Their return type is the new `TypeValidator<T, E>`: a `ValidatorTest<T, E>` that is also a Standard Schema with output `T`.
- `createValidator(fn)` takes an async `(value, field) => Promise<ValidatorResult<T, E>>` and returns a `TypeValidator<T, E>` with `T` and `E` inferred from `fn`. A validator that already has this library's `~standard` is returned as it is.
- `standard()` is removed. Drop it around built-in validators, and change `standard(fn)` to `createValidator(fn)`.
- Code that compares a type validator's type to `ValidatorTest<T, E>` exactly, such as `ReturnType<typeof string>`, needs `TypeValidator<T, E>`. Assigning one to a `ValidatorTest` or a `ValidatorFactory` still works.
