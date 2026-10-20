# validator-fns

## 3.0.0-next.4

### Major Changes

- 6ebb356: `array()` and `object()` run in three phases. The built-in `min()`, `max()` and `exact()` passed to `array()` check the length before any item runs, wherever they come among the tests, and a failure is the result. Every item or property then runs, even after one fails. The remaining tests, collection tests, run only once every child is valid. `array()`'s collection tests now take the parsed items, typed `Test<T[]>`, and pass their values on, so a test's valid value is the array's value. A `min()` wrapped in a test of your own runs after the items.

  Adds `object(schema, { strict: true })`, which fails keys outside the schema with the `unknownKeys` code and `{ keys }` before any property runs. `BuiltInCode` includes `unknownKeys`. Without `strict`, unknown keys are still left out of the value.

- 4704703: Adds `createTypeValidator(parser)`, which makes a custom validation type from any validator as its parser. It returns a function with the validation types' call shape, `(config?, ...tests)`, whose config takes `default` and `messages`. The parser reads present input only, a parsed `undefined` or `null` counts as missing, and its failure keeps its own code, params, message and errors, which `messages` words when it has no message. `createTypeValidator(string(uuid()))()` fails `42` with `type` and `'nope'` with `uuid`. A `parser` that isn't a function throws a `TypeError`.

  `createTypeValidatorTest()` is removed, and so is the `parser` option of `string()`, `number()`, `boolean()`, `date()` and `array()`. Make a custom type with `createTypeValidator(parser)` instead, and do in its tests what `applyConfig` did.

- 0194ba2: A `minDate()` or `maxDate()` limit with a part out of its range, such as `'2020-13'`, `'2020-02-30'`, `'2020-01-01T24:00'` or a UTC offset of `+24:00`, throws ``TypeError('`limit` must be a valid date')`` when the test is built, instead of rolling over into a neighbouring day, month or year. `coerce.date()` fails such text with `type`. The years 0 to 99 read as written, so `'0050-01-01'` is the year 50, not 1950.
- c552940: `default` fills only missing input, `undefined` or `null`: `string({ default })` no longer replaces `''`, and `array({ default })` no longer replaces `[]`. The default skips the parser, and the tests run on it.

  `object()` builds a missing object from its properties, as 2.x did: each property's validator runs on `undefined`, and when every one is valid, the built object is the value and the collection tests run on it. Otherwise the object fails with `required`, and `optional()` of it gives the missing value. An object whose properties all accept a missing value, such as `object({})`, now accepts one, and its collection tests run on the built object inside `optional()` too: `optional(object({ email: optional(string()), phone: optional(string()) }, check((value) => value.email !== undefined || value.phone !== undefined, 'contact')))` now fails a missing object with `contact`. Let the check pass an object whose fields are all `undefined` to accept a missing one.

- a84a132: Every failure carries a `code`, such as `min`, `required` or `type`, and `params`, such as `{ min, amount }`, beside its `message`. Messages are optional on every built-in test, and core ships no English: a failure without a message reads its code, so `'Required.'` is now `'required'` and `'Failed to parse value to number.'` is `'type'` with `{ expected: 'number' }`.

  A type validator's `messages` config, keyed by code, replaces `requiredMessage` and words the validator's own failures: `required`, `type`, `items`, `properties` and its tests' codes. A message passed to a test wins over it, and it doesn't word an array's items or an object's fields.

  Custom failures name their code: `createValidatorTest(code, test, message?, getParams?)`, `check(path?, test, code, message?)` and `invalid({ code, params?, message?, value?, field, errors? })`, where `params` replaces `extras`. The `limit` message key is gone from `min()`, `max()`, `exact()`, `minDate()` and `maxDate()`, and `email()` and `uuid()` no longer pass their pattern. `Messages` and `BuiltInCode` are exported.

  Standard Schema issues carry `code` and `params`, and an `array()` or `object()` whose children failed reports only their issues. The `'Invalid value.'` fallback is gone.

- 212a6dc: Failures carry no `value`. An invalid result has `state`, `message`, `field` and `errors`, and in TypeScript `Failure` has no `value` key, so reading `result.value` needs `result.state === 'valid'` first. This also ends the difference where `array()` and `object()` returned the raw input as a failure's `value` while other validators returned the parsed value (#685).

  Messages still get `value`. `invalid()` takes `value` as optional and uses it only to format the message.

- 708dd8a: An `array()` or `object()` failure's `errors` tree holds each failed child's failure as the child returned it, with its `code`, `params`, `message`, `field` and own `errors`, instead of its message. A valid array item is `null`, an object lists only its failed properties, and a child that failed through its own children is an `items` or `properties` failure with its own tree. A failed array test, such as `max()`, gives a failure without the items' errors. `ArrayItemValidatorResult` is gone: an array's errors are `(Failure<E> | null)[]`, and an object's have a `Failure` per key.

  Every `field` is the full path from the caller's field, such as `user.a.b`, `user.tags[1].name`, or `[1]` for a root array's item, and messages with `{field}` get it. `check()` with a path puts its failure, with the full field, under a `properties` failure for the object and each name.

  The new `messageTree(result)` gives the nested messages, `undefined` for a valid result, for form libraries such as Formik. Standard Schema issues carry `code` and `params` at every depth, one per leaf of the tree. Both throw a `TypeError` for a tree that isn't one, such as an entry that isn't a whole failure, one nested more than 1000 levels deep, which a cyclic tree also reaches, or one with more than 1,000,000 entries, counting a shared failure once for each entry that holds it.

- eb99836: Only `undefined` and `null` are missing. They fail with `required`, `optional()` returns them as they are, and a `parser` never gets them. `''`, `NaN` and an invalid `Date` are present: `string()` accepts `''`, so add `min(1)` to reject it, and `number()`, `date()` and `boolean()` fail them with `type`.

  Each type validator accepts only its own type and fails anything else with `type`: `string()` strings, `number()` finite numbers, `boolean()` booleans, `date()` valid `Date` instances, `array()` arrays, and `object()` objects other than arrays, functions and boxed primitives, except a boxed Symbol or BigInt whose prototype was replaced, which `object()` can't tell from a plain object without a throwing check. In 2.x, `number('42')` was `42`, `string(42)` was `'42'`, `boolean('false')` was `true` and `array('abc')` was `['a', 'b', 'c']`. A `Date` from another realm, such as an iframe, now passes `date()` and matches in `oneOf()` and as a `minDate()` or `maxDate()` limit. A `minDate()` or `maxDate()` limit that isn't a valid date, `null` and `undefined` included, throws ``TypeError('`limit` must be a valid date')`` when the test is built, and `min` and `max` in their message params narrow to `Date`. Dates compare by `getTime()`, so a date's own `valueOf` no longer changes a match or a limit.

- 13c5c94: Raises the supported browsers to Chrome and Edge 93, Firefox 92 and Safari 15.4 (iOS 15.4), from Chrome and Edge 85, Firefox 77 and Safari 13.1 (iOS 13.4). The library now uses `Object.hasOwn` and logical assignment (`||=`, `??=`). To support an older browser, polyfill `Object.hasOwn` and transpile logical assignment.
- b419000: `object()` throws a `TypeError` naming the key when a schema property isn't a validator, when the validator is built, instead of failing that field with `'No validator set'` on every call.
- cfde894: Tests are steps: type validators and `object()` run their tests in order, each test's valid value goes to the next, and the last one is the result's value. A custom test that resolves to `valid()` with a different value now changes the value. `Test<T, E>` resolves to `Result<T, E>`, so a step keeps the type, and `min()`, `max()` and `exact()` take their type from the validator they're passed to. `array()`'s tests still only check, for now.

  Adds `transform(fn)`, a test that changes the value with a synchronous `fn` and never fails. `string()`'s `trim` option is removed: use `transform((s) => s.trim())`. A trimmed value isn't checked for missing again, so `'  '` becomes `''` for the next tests instead of failing with `required`.

- 39789aa: A throw from your code now rejects from every validator, with the thrown value as it is. In 2.x, `string()`, `number()`, `boolean()`, `date()` and `createTypeValidatorTest()` validators turned a throw from a test, a `requiredMessage` function or a `parser` into an invalid result with the error's message, while `array()` and `object()` rejected. Input a validator can't read still gives an invalid result.

  A custom `parser` returns a result instead of the value: `valid({ value, field })`, or `invalid({ message, field })` for input it can't read, instead of throwing. It gets the field name as its second argument. `createTypeValidatorTest()` runs the config's `parser` itself, so `applyConfig` gets the parsed value instead of calling `config.parser`.

- b9e47f7: Removes the helper exports, the `round` option and the `exclusive` argument:

  - `applyArrayConfig`, `applyBooleanConfig`, `applyDateConfig`, `applyNumberConfig`, `applyStringConfig`, `parseArray`, `parseBoolean`, `parseNumber`, `parseString`, `parseDate`, `invalidDate`, `hasOwnProperty`, `isObject` and `formatMessage` are no longer exported. Parse with the type validator, such as `number()`, and let `invalid()` and `createValidatorTest()` format messages.
  - The types `DeepPartial`, `ValidatorFactory`, `SharedValueType`, `SharedDateValueType` and `ConfigBase` are no longer exported. A `createTypeValidatorTest()` config type declares `parser` and its options itself.
  - `number()` no longer takes `round`. Use `integer()`, which rejects a number that isn't an integer.
  - `min()`, `max()`, `minDate()` and `maxDate()` no longer take `exclusive`, and their messages no longer get it. Write a strict bound with `check()`, such as `check((value) => value > 0, 'Must be positive.')`.

- 7c1c34d: Renames the result and validator types, with no aliases for the old names:

  | Before            | After       |
  | :---------------- | :---------- |
  | `ValidatorResult` | `Result`    |
  | `ValidResult`     | `Valid`     |
  | `InvalidResult`   | `Failure`   |
  | `ValidatorTest`   | `Validator` |
  | `ValidationTest`  | `Test`      |

  Only the names change. The types and `state`'s `'valid' | 'invalid'` stay the same.

### Minor Changes

- b0dc869: Adds `coerce.number()`, `coerce.boolean()` and `coerce.date()`, which read text such as form fields and query strings, then validate what they read as `number()`, `boolean()` and `date()` do, with the same `(config?, ...tests)`. Each reads its input before the missing check, so blank text (`''` or only whitespace) is missing: it fails with `required`, takes the `default`, or is valid `undefined` inside `optional()`. `coerce.number()` reads trimmed decimal text, `coerce.boolean()` reads `true`/`false`, `1`/`0` and `on`/`off` in any case, and `coerce.date()` reads ISO 8601 text and timestamps. Text a twin can't read, such as `'12px'` or `'yes'`, fails with `type`, as in the strict built-in.
- 30f4802: Add `parse(validator, value, field?)`, which resolves to the parsed value or rejects with a `FailureError` for invalid input. A `FailureError`'s `failure` is the whole failure with its errors tree, and its `message` has a `field: message` line for each leaf. A bug still rejects with its thrown value unwrapped, so `instanceof FailureError` tells a failure from a bug.
- b4475a0: Add `withMessages(validator, messages)`, which binds a translation to a whole validator tree, and `validator-fns/en`, which exports `en`, English messages for every built-in code. After each run, `withMessages()` words each failure made without a message by its code, so a message passed to a test or set in a `messages` config, and an inner `withMessages()`, win. Its results and `~standard` carry the messages, and `optional()` works around it in either order. Compose translations with spread, such as `{ ...en, taken: 'Taken.' }`.

  Each `properties` failure on a `check()` path now gets the value at its level for its message. A message template no longer throws for a value without a string form, such as `Object.create(null)`, which reads as its tag, and a `{name}` placeholder reads only the parameters' own keys.

### Patch Changes

- d4ae50c: `array()` now validates the items of an array with its own `entries` property. It used to validate what that property returned, or reject when it wasn't a function.
- f37a2a8: A recursive validator, whose custom validator calls it again, now validates input nested to any depth. It used to reject with a `RangeError` past about 2,300 levels of `object()`.
- d4ae50c: `optional()` of a Proxy of a type validator, or of a function with a type validator's properties assigned, now runs that wrapper. It used to run the type validator in its place.
- abf62ff: A Proxy of a built-in test, or a function with a built-in test's properties assigned, now runs as itself when a type validator runs its tests. It used to run the built-in test in its place.

## 3.0.0-next.3

### Major Changes

- a469987: `array()` takes its item validator first: `array(item, config?, ...tests)`, as `object(properties, config?, ...tests)` does. Change `array(config, item, ...tests)` to `array(item, config, ...tests)`. `array(config?)` without an item validator still works and keeps the items as they are. Passing the config first with an item validator throws a `TypeError`.

  `object()` takes one type parameter, the schema, instead of three. Its inferred value and error types are unchanged; explicit type arguments such as `object<Schema, Value, Errors>(…)` become `object<Schema>(…)`.

- 3cca945: `check()` types its `path` and its errors. The path must name properties of the parsed object, or a path into its nested objects, so a misspelled property is a type error. The test's error type is the errors it produces, such as `{ confirm?: string }` for `'confirm'` or `{ shipping?: { zip?: string } }` for `['shipping', 'zip']`, instead of a free type parameter `E`. An empty path `[]` is a type error; leave the path out instead. Runtime behavior is unchanged.
- a477cd9: Validation tests take the value type they check, and messages are typed by their extra parameters.

  - The new `ValidationTest<T, E>` type is a test that takes a value of type `T`. Built-in tests and `check()` return it, `ValidatorFactory` and the validation types take it, and `createValidatorTest`'s callback gets `T` instead of `unknown`. A test on another type, such as a boolean test passed to `string()`, is a type error. A custom test that takes `unknown` still fits every validation type.
  - Built-in tests called directly with `null` or `undefined` fail instead of passing them through, and an empty string is checked like any other string, so `min(1, …)('')` fails. Validation types never pass these to tests, so validators behave as before.
  - `ValidatorMessage<T, X>` takes the extra message parameters `X` instead of the whole parameter type. Each test's exported `*MessageParameters` type keeps its meaning, and a message annotated with it still fits.
  - `invalid()` gives a message function `value` as `unknown`, and needs `extras` when the message reads extra parameters. `formatMessage` takes the extras type as its second type parameter.

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
