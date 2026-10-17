---
'validator-fns': major
---

Type validators are [Standard Schemas](https://standardschema.dev) without `standard()`. `string()`, `number()`, `boolean()`, `date()`, `array()`, `object()`, validators made with `createTypeValidatorTest`, and every validator `optional()` returns carry `~standard`, and their return type is the new `TypeValidator<T, E>`: a `ValidatorTest<T, E>` that is also a Standard Schema with output `T`. `standard()` returns these validators as they are and still wraps custom validators. Code that compares a type validator's type to `ValidatorTest<T, E>` exactly, such as `ReturnType<typeof string>`, needs `TypeValidator<T, E>`. Assigning one to a `ValidatorTest` or a `ValidatorFactory` still works.
