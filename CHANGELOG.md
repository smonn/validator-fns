# validator-fns

## 3.0.0-next.2

### Major Changes

- 5614c49: **Type validators are required by default.** `string()`, `number()`, `boolean()`, `date()`, `array()`, `object()` and validators made with `createTypeValidatorTest` reject a missing value with `'Required.'`. A missing value is `undefined`, `null`, an empty string, `NaN` or an invalid date, after parsing and `default`. `required()` is removed. Wrap a validator in the new `optional()` to accept a missing value again.

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

- 2071722: Type validators are [Standard Schemas](https://standardschema.dev) themselves, and `createValidator(fn)` replaces `standard()`.

  - `string()`, `number()`, `boolean()`, `date()`, `array()`, `object()`, validators made with `createTypeValidatorTest`, and every validator `optional()` returns carry `~standard`. Their return type is the new `TypeValidator<T, E>`: a `ValidatorTest<T, E>` that is also a Standard Schema with output `T`.
  - `createValidator(fn)` takes an async `(value, field) => Promise<ValidatorResult<T, E>>` and returns a `TypeValidator<T, E>` with `T` and `E` inferred from `fn`. A validator that already has this library's `~standard` is returned as it is.
  - `standard()` is removed. Drop it around built-in validators, and change `standard(fn)` to `createValidator(fn)`.
  - Code that compares a type validator's type to `ValidatorTest<T, E>` exactly, such as `ReturnType<typeof string>`, needs `TypeValidator<T, E>`. Assigning one to a `ValidatorTest` or a `ValidatorFactory` still works.

- 2ae81bb: `date()` fails input that isn't a `Date`, number, or string, such as `true`, `{}`, or `[2020]`, with `Failed to parse value to date.`, instead of reading it as an invalid date, which counts as missing. `optional(date())` no longer accepts such input. `parseDate` throws a `TypeError` for it. `null` and `undefined` are still missing.
- da3ef49: `date()` fails a non-blank string that isn't ISO 8601, such as `'tomorrow'` or `'12/31/2020'`, with `Failed to parse value to date.`, instead of reading it as an invalid date, which counts as missing. A typo in a date field no longer reports `'Required.'`, and `optional(date())` no longer accepts it. Blank strings and invalid `Date` objects still count as missing. `parseDate` throws a `TypeError` for the same strings.

## 3.0.0-next.1

### Major Changes

- 50525a5: `applyArrayConfig` no longer takes a type parameter and returns `unknown[] | null | undefined`. Remove the type argument from calls such as `applyArrayConfig<string>(config, value)`, and check the items' type where you use them.
- 664623e: `array()` and `object()` record an empty string `''` for an item or field that fails with an empty message and no `errors`, instead of `undefined`. `null` still marks an array item that passed. Only custom validators can fail this way; the built-in tests always set a message.
- 99671be: TypeScript 5.4 or later is required for the type declarations. `createTypeValidatorTest` now infers the config type from `applyConfig`, so a custom type validator no longer needs explicit type arguments to accept options that `defaultConfig` doesn't set. Explicit type arguments still work.
- 1fe3f32: `number()` returns an invalid result (`Failed to parse value to number.`) for non-blank input it can't read as a number, such as `'abc'` or `true`, instead of a valid `NaN`. A blank string still gives `NaN`, which `required()` treats as empty and the `default` option replaces. `parseNumber` throws a `TypeError` for the same input.
- 813d598: `object()`'s value type includes `null` for each field, as in `{ name?: string | null }`, matching what it returns for a `null` field. Code that read those fields as non-null now needs a `null` check.
- 1150a43: `string()` and `number()` return an invalid result for arrays, Maps, Sets, functions, RegExps, plain objects, other non-primitive objects, and symbols, instead of coercing them (`[1]` used to pass `string()` as `"1"` and `number()` as `1`). Dates and `String`, `Number`, or `Boolean` objects are still accepted. `parseString` and `parseNumber` throw a `TypeError` for the same input.
- 5c88a3f: Remove the deprecated `isValid` property from validation results. Replace `result.isValid` with `result.state === 'valid'`, which also narrows the result type.
- cdecb5f: `url()` now allows only `http:` and `https:` URLs by default, so `javascript:` and `data:` URLs are invalid. Pass a list of protocols to allow others; the list replaces the default, so include `http:` and `https:` in it if you still want them.

## 3.0.0-next.0

### Major Changes

- c45e7bc: Require Node.js 22 or later. Node.js 18 and 20 have reached end of life. The README now states the support policy: Node.js versions in active or maintenance LTS when a version is released, with a version dropped only in a major release.
- 88418af: Type changes that replace `any` with checked types:

  - `ValidatorTest` and `ValidatorResult` default their value and error types to `unknown` instead of `any`. Code that reads `value` or `errors` from an untyped result now needs a type argument or a check.
  - `createValidatorTest` defaults its value type to `unknown` and its error type to `never`, so a message function's `value` is `unknown` unless you pass a type argument.
  - Validators made with `createTypeValidatorTest`, including `string`, `number`, `boolean` and `date`, only accept tests whose `errors` type is `string`. The built-in tests and `invalid()` without `errors` now have the error type `never`, so they still fit.

## 2.2.0

### Minor Changes

- e6d9d88: `object(schema, ...tests)` takes object-level tests, which run on the parsed object once every property is valid. The new `check(path?, test, message)` compares fields and puts its message on a property, a nested path such as `['shipping', 'zip']`, or the object itself:

  ```ts
  object(
    { password: string(required('Required.')), confirm: string() },
    check(
      'confirm',
      (value) => value.confirm === value.password,
      'Must match.',
    ),
  );
  ```

- 9232b88: New `standard(validator)` adds the [Standard Schema](https://standardschema.dev) interface to any validator, so libraries that accept a Standard Schema can use it. `~standard.validate` returns a promise; invalid results become issues with paths built from `errors`.

### Patch Changes

- 583e0d5: `array(itemTest)` returns the values its item validator parsed, as its type always declared: `array(number())` now turns `['1', '2.5']` into `[1, 2.5]`, and `array(string({ trim: true }))` trims each item. It used to return the items as they came in.
- 08c675f: `object()` reads only the input's own properties. A missing field named like an inherited property, such as `constructor` or `toString`, now reaches its validator as `undefined`, so `required()` reports it instead of passing the inherited method.
- a99b12a: `object()` keeps a schema key named `__proto__` as an own property of `value` and `errors`. It used to drop a string or `null` result, and an object result became the prototype of the returned value.
- 91f0176: Type validators run built-in tests without an `await` per test, which about doubles throughput for objects of simple fields. Results are unchanged, and every validator and test still returns a promise.

## 2.1.0

### Minor Changes

- 38b00d3: Add the `uuid(message)` validation test. It accepts RFC 9562 UUIDs of any version from 1 to 8, plus the nil and max UUIDs, in any letter case.

## 2.0.5

### Patch Changes

- 640c6c3: The RunKit example is now `runkit.cjs`. As `runkit.js` it loaded as an ES module, so its `require` call failed.

## 2.0.4

### Patch Changes

- f152ed5: Remove `engines.pnpm` from the published `package.json`. It applied to everyone installing validator-fns, so pnpm 8 and older failed to install it with `engine-strict` on. The library never needed a particular package manager. `engines.node` is unchanged.

## 2.0.3

### Patch Changes

- 6e6fdca: `matches()` now starts each test at index 0 when the pattern has the `g` or `y` flag. Before, a match advanced the pattern's `lastIndex`, so the next value could fail even when it matched, and the caller's `lastIndex` changed.
- 988a3ca: Type validators such as `string()` and `number()`, and validators built with `createTypeValidatorTest`, no longer cache results by value. The cache had no size limit, so memory grew with every distinct value, and a repeated value returned the first call's `field`.

  Custom tests now run on every call, including for a repeated value. If a custom test does expensive work, such as a server lookup, memoize it in the test.

- 62529a1: Document that `url()` without `protocols` accepts `javascript:` and `data:` URLs. Pass `['http:', 'https:']` when you render the value as a link.

## 2.0.2

### Patch Changes

- `require('validator-fns')` now resolves. The `require` export pointed outside `dist/` since 2.0.0, so CommonJS consumers and their type checkers failed to load the package (#489).

Releases before 2.0.2 are listed on [GitHub Releases](https://github.com/smonn/validator-fns/releases).
