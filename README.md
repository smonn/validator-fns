# validator-fns

![current version](https://img.shields.io/npm/v/validator-fns?color=%23369&label=current%20version) ![minified size](https://img.shields.io/bundlephobia/min/validator-fns?color=%23369) ![minified plus gzip size](https://img.shields.io/bundlephobia/minzip/validator-fns?color=%23369&label=minified%20plus%20gzip%20size) ![supported node version](https://img.shields.io/node/v/validator-fns?color=%23369&label=supported%20node%20version) ![included types](https://img.shields.io/npm/types/validator-fns?color=%23369&label=included%20types) ![license](https://img.shields.io/npm/l/validator-fns?color=%23369) ![dev dependencies](https://img.shields.io/librariesio/release/npm/validator-fns?color=%23369&label=dev%20dependencies) ![code coverage](https://img.shields.io/coveralls/github/smonn/validator-fns?color=%23369&label=code%20coverage) ![total downloads](https://img.shields.io/npm/dt/validator-fns?color=%23369&label=total%20downloads)

Small asynchronous validation library. Tries to be as small as possible and use no external dependencies. Note that this library does not include localized error messages. API inspired by [yup][yup]. Built using TypeScript and includes definition files. This library targets modern browsers only--configure your build accordingly.

[npm][npm] | [github][github]

<!-- toc -->

- [Install](#install)
- [Usage](#usage)
- [Migrating from 2.x](#migrating-from-2x)
- [API Reference](#api-reference)
  - [Validation result](#validation-result)
  - [Validation error message](#validation-error-message)
  - [Required and optional values](#required-and-optional-values)
  - [Unreadable input and throws](#unreadable-input-and-throws)
  - [Validation types](#validation-types)
  - [Validation tests](#validation-tests)
  - [Custom validation](#custom-validation)
- [Supported environments](#supported-environments)

<!-- tocstop -->

## Install

```sh
npm install validator-fns
# or
yarn add validator-fns
```

## Usage

> **Upgrading from 2.x?** Every validator is now required unless you wrap it in `optional()`, and `required()` is gone. See [Migrating from 2.x](#migrating-from-2x).

Every type validator rejects a missing value unless it's wrapped in `optional()`. This is a fairly exhaustive example of what's possible with `validator-fns`.

<details><summary>example</summary>

```js
import {
  array,
  boolean,
  createValidator,
  date,
  email,
  exact,
  integer,
  matches,
  max,
  maxDate,
  min,
  minDate,
  number,
  object,
  oneOf,
  optional,
  string,
  url,
  valid,
  invalid,
} from 'validator-fns';
// optionally, you can do
// import * as validatorFns from 'validator-fns';

const ONE_DAY = 1000 * 60 * 60 * 24;
const TEN_DAYS = ONE_DAY * 10;
const now = new Date();
const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);

const customValidator = createValidator(async (value, field) => {
  if (value === 'hello') {
    return valid({ value, field });
  }
  return invalid({
    message: 'Must be "hello".',
    value,
    field,
  });
});

const validate = object({
  firstName: string({
    trim: true,
    requiredMessage: 'First name is required.',
  }),
  emailAddress: string(
    { requiredMessage: 'Email address is required.' },
    email('Must be a valid email address.'),
  ),
  age: number(
    { requiredMessage: 'Age is required.' },
    integer('Age must be a whole number.'),
    min(18, 'Must be at least {min} years old.'),
  ),
  homepage: optional(string(url('Must be a valid URL.', ['http:', 'https:']))),
  fruit: string(
    { default: 'apple' },
    oneOf(
      ['apple', 'orange', 'banana'],
      ({ values }) => `Must be ${values[0]}, ${values[1]} or ${values[2]}.`,
    ),
  ),
  favoriteCarMakers: array(
    string(
      { requiredMessage: 'Car brand is required.' },
      oneOf(
        [
          'BMW',
          'Ferrari',
          'Fiat',
          'Ford',
          'Honda',
          'Kia',
          'Mercedes',
          'Subaru',
          'Tesla',
          'Toyota',
          'Volvo',
        ],
        'Must be a known car brand.',
      ),
    ),
    { default: [] },
    min(2, 'Must pick at least two.'),
    max(4, 'Must pick at most four.'),
  ),
  startDate: optional(
    date(
      minDate(now, 'Must be on or after today.'),
      maxDate(tenDaysFromNow, 'Must be at most ten days from now.'),
    ),
  ),
  optIn: boolean({ requiredMessage: 'Must decide to opt in or out.' }),
  notRobot: number(
    { requiredMessage: 'Must enter the correct answer.' },
    exact(42, 'This is the answer.'),
  ),
  postalCode: optional(
    string(matches(/^[0-9]{5}$/, 'Must be a five-digit number.')),
  ),
  custom: customValidator,
});

// later...
const result = await validate({
  age: 20,
  custom: 'hello',
  emailAddress: 'foo@example.com',
  favoriteCarMakers: ['Ferrari', 'Tesla'],
  firstName: 'Bob',
  fruit: 'apple',
  homepage: 'https://www.example.com',
  notRobot: 42,
  optIn: false,
  postalCode: '12345',
  startDate: new Date(),
});

if (result.state === 'valid') {
  // do something with the parsed values
  console.log(result.value);
} else {
  // handle and display errors
  console.error(result.errors);
}
```

</details>

## Migrating from 2.x

Version 3 makes every type validator required by default. In 2.x, a validator without `required()` accepted `undefined`, `null` and the other missing values; in 3.x, it rejects them with `'Required.'`.

1. **Move each `required(message)` into the config as `requiredMessage`**, merging it into a config object that's already there:

   ```js
   // 2.x
   string(required('Enter a name.'), min(2, 'Too short.'));
   string({ trim: true }, required('Enter your city.'));
   array(string(), required('Pick some.'));

   // 3.x
   string({ requiredMessage: 'Enter a name.' }, min(2, 'Too short.'));
   string({ trim: true, requiredMessage: 'Enter your city.' });
   array(string(), { requiredMessage: 'Pick some.' });
   ```

2. **Wrap each validator that had no `required()` in `optional()`**, or it now rejects a missing value:

   ```js
   // 2.x
   string(email('Must be an email.'));

   // 3.x
   optional(string(email('Must be an email.')));
   ```

3. **Replace `required(message, true)`** (nullable): `optional()` accepts `null`, as well as the other missing values.
4. **Move `array()`'s config after the item validator**: `array(config, item, ...tests)` becomes `array(item, config, ...tests)`, as in `object(schema, config, ...tests)`. `array(config)` without an item validator stays. Passing the config first with an item validator throws a `TypeError`:

   ```js
   // 2.x
   array({ default: [] }, string(), min(2, 'Pick two.'));

   // 3.x
   array(string(), { default: [] }, min(2, 'Pick two.'));
   ```

5. **Check `object()` calls with a second argument**: it's a config object or the first object-level test, as in `object(schema, { requiredMessage }, ...tests)`. A missing object now fails with its `requiredMessage` instead of reporting each field as missing; wrap it in `optional()` to accept one.
6. **Replace `standard()`**: remove it around built-in validators, which are Standard Schemas themselves, and change `standard(fn)` to `createValidator(fn)`:

   ```js
   // 2.x
   standard(object({ email: string() }));
   standard(async (value, field) => valid({ value, field }));

   // 3.x
   object({ email: string() });
   createValidator(async (value, field) => valid({ value, field }));
   ```

7. **In TypeScript**, a valid result's `value` no longer includes `null` or `undefined` unless the validator is wrapped in `optional()`, and `object()` makes only `optional()` keys optional. `valid()` takes a value of the validator's type, so a custom validator that returns `null` or `undefined` needs them in its type, such as `Validator<string | undefined>`. `object()` takes one type parameter, the schema, so explicit type arguments such as `object<Schema, Value, Errors>(…)` become `object<Schema>(…)`, or can be left out. `check()`'s `path` must name properties of the parsed object, and an empty path `[]` is a type error; leave the path out instead. Tests are typed `Test<T, E>` and take the validator's value type, so a custom test that takes another type, or a test called directly with `null`, is a type error. A message function passed to `invalid()` gets `value` as `unknown`, and one that reads extra parameters needs them in `extras`.
8. **Rename the TypeScript types** that 3.x removes, with no aliases. The last 2.x release deprecates them and adds the new names, so the rename can come first:

   | 2.x, deprecated   | 3.x         |
   | :---------------- | :---------- |
   | `ValidatorResult` | `Result`    |
   | `ValidResult`     | `Valid`     |
   | `InvalidResult`   | `Failure`   |
   | `ValidatorTest`   | `Validator` |

9. **Read `value` only from a valid result**: a failure has no `value`, so code that read the parsed or raw input from an invalid result needs to keep the input itself. In TypeScript, `Failure` has no `value` key, so reading `result.value` needs `result.state === 'valid'` first. Messages still get `value`, and `invalid()` uses its `value` only for the message:

   ```js
   // 2.x
   await number(min(5, 'Too small.'))('3');
   // { state: 'invalid', message: 'Too small.', value: 3, ... }

   // 3.x
   await number(min(5, 'Too small.'))('3');
   // { state: 'invalid', message: 'Too small.', ... }
   ```

10. **Replace the helpers 3.x no longer exports**:

    | 2.x                                                                         | 3.x                                                                                                                                       |
    | :-------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
    | `parseArray`, `parseBoolean`, `parseDate`, `parseNumber`, `parseString`     | The type validator, such as `number()`.                                                                                                   |
    | `applyArrayConfig` and the other `apply…Config` functions                   | The type validator, with its config.                                                                                                      |
    | `formatMessage`                                                             | `invalid()` and `createValidatorTest()`, which format their message.                                                                      |
    | `hasOwnProperty`                                                            | `Object.prototype.hasOwnProperty.call(object, key)`.                                                                                      |
    | `isObject`                                                                  | `Object.prototype.toString.call(value) === '[object Object]'`.                                                                            |
    | `invalidDate`                                                               | `new Date('')`.                                                                                                                           |
    | `ConfigBase`                                                                | A config type that declares `parser` and its options, as in [createTypeValidatorTest](#createtypevalidatortestdefaultconfig-applyconfig). |
    | `DeepPartial`, `ValidatorFactory`, `SharedValueType`, `SharedDateValueType` | Your own type.                                                                                                                            |

11. **Replace `round` with `integer()`**, which rejects a number that isn't an integer instead of rounding it, **and `exclusive` with `check()`**. Messages for `min()`, `max()`, `minDate()` and `maxDate()` no longer get `exclusive`:

    ```js
    // 2.x
    number({ round: 'floor' }, min(0, 'Must be positive.', true));

    // 3.x
    number(
      integer('Must be a whole number.'),
      check((value) => value > 0, 'Must be positive.'),
    );
    ```

12. **Expect a rejection when your code throws.** In 2.x, `string()`, `number()`, `boolean()`, `date()` and `createTypeValidatorTest()` validators turned a throw from a test, a `requiredMessage` function or a `parser` into an invalid result with the error's message, while `array()` and `object()` rejected. In 3.x, every validator rejects with the thrown value. Input a validator can't read still gives an invalid result.
13. **Return a result from a custom `parser`**, made with `valid()` or `invalid()`, instead of the value, and fail input it can't read with `invalid()` instead of throwing. The parser gets the field name as its second argument, for the result. `createTypeValidatorTest()`'s `applyConfig` gets the parsed value, so it no longer calls `config.parser`:

    ```js
    // 2.x
    const shout = string({
      parser: (value) => {
        if (typeof value !== 'string') throw new TypeError('Must be text.');
        return value.toUpperCase();
      },
    });

    // 3.x
    const shout = string({
      parser: async (value, field) =>
        typeof value === 'string'
          ? valid({ value: value.toUpperCase(), field })
          : invalid({ message: 'Must be text.', field }),
    });
    ```

## API Reference

### Validation result

All validation tests yield one of two results: `valid` and `invalid`. Both are objects. In TypeScript the result is `Result<T, E>`, either `Valid<T>` or `Failure<E>`, and a validator is `Validator<T, E>`, where `T` is the value type and `E` the `errors` type. Both default to `unknown`.

| property  | type   | description                                                                |
| :-------- | :----- | :------------------------------------------------------------------------- |
| `state`   | string | Either `valid` or `invalid`.                                               |
| `field`   | string | Either the field name or `undefined`.                                      |
| `value`   | `T`    | The parsed value. Only if `state` is `valid`; a failure has no `value`.    |
| `message` | string | The error message unless `state` is `valid`.                               |
| `errors`  | `E`    | Only if `state` is `invalid` and using the `object` or `array` validators. |

### Validation error message

The `message` argument in the validation tests must be a static string, a template string, or a function returning a string.

| type            | example                                                                                |
| :-------------- | :------------------------------------------------------------------------------------- |
| static string   | `'Username is required.'`                                                              |
| template string | `'Password must be at least {min} characters.'`                                        |
| function        | `` ({ value, field, max }) => `${field} must be less than ${max} but was ${value}.` `` |

A message always gets the parsed `value`, although the failure has none. If available, `field` is also provided. Depending on the validator, additional fields may be available, such as `min` for `min()`.

In TypeScript, a message function's parameters are typed: `ValidatorMessage<T, X>` gets the value and field, `X & ValidatorMessageParameters<T>`, where `X` holds the test's extra parameters. Each test's exported parameters type, such as `MinValidatorMessageParameters`, still describes everything a message gets, so a message annotated with it fits.

### Required and optional values

Every validation type rejects a missing value: `undefined`, `null`, an empty string `''`, `NaN`, or an invalid date. It checks after parsing and `default`, so `string({ trim: true })` treats `'  '` as missing, `number()` treats a blank string as missing, and a `default` fills a missing value before the check. The tests only run on present values.

The message is `'Required.'` unless the config sets `requiredMessage`, which takes a [validation error message](#validation-error-message):

```js
await string()('');
// { state: 'invalid', message: 'Required.', ... }

await number({ requiredMessage: '{field} is required.' })(undefined, 'age');
// { state: 'invalid', message: 'age is required.', ... }
```

#### optional(validator)

Returns a validator that accepts a missing value. The missing value skips the tests and becomes the result's `value` as parsed, so `optional(number())('')` is valid with `NaN`. Present values go through `validator` as usual. The validator passed in is unchanged.

```js
const nickname = optional(string(min(2, 'Too short.')));

await nickname(undefined); // { state: 'valid', value: undefined, ... }
await nickname('a'); // { state: 'invalid', message: 'Too short.', ... }
```

For a custom validator, `optional()` accepts `undefined` and `null` without calling it, and passes every other value to it.

In TypeScript, a validator's value type is `T`, and `optional()` adds `null` and `undefined`. In `object()`, a key is optional when its validator's value type includes `undefined`, so `object({ name: string(), age: optional(number()) })` is typed `{ name: string; age?: number | null | undefined }`.

### Unreadable input and throws

Input a validation type can't read gives an invalid result. For example, `number()` fails `'abc'` with `'Failed to parse value to number.'`. A validator never rejects for its input.

A throw from your own code is a bug, so the validator rejects with the thrown value as it is, without wrapping it. That covers a test, a `requiredMessage` function, a `parser`, `createTypeValidatorTest()`'s `applyConfig`, and a validator passed to `array()` or `object()`. `~standard.validate` rejects the same way. Bad configuration, such as `object('nope')` or `minDate('nonsense', message)`, throws a `TypeError` when the validator or test is built.

A custom `parser` takes the input and the field name, and returns a result: `valid()` with the parsed value, or `invalid()` for input it can't read. A parsed `undefined` or `null` counts as missing, as with the built-in parsers.

```js
const upper = string({
  parser: async (value, field) =>
    typeof value === 'string'
      ? valid({ value: value.toUpperCase(), field })
      : invalid({ message: 'Must be text.', field }),
});

await upper('abc'); // { state: 'valid', value: 'ABC', ... }
await upper(42); // { state: 'invalid', message: 'Must be text.', ... }
```

### Validation types

A **validation type** is expected to parse and prepare the value for the provided validation tests. For example, the `string` validation type ensures the provided value is a string, and rejects a missing value unless wrapped in [`optional()`](#optionalvalidator). It must be a function that takes a value of any type and returns a promise which resolves to a validation result (see above).

- [array(itemTest?, config?, ...tests)](#arrayitemtest-config-tests)
- [boolean(config?, ...tests)](#booleanconfig-tests)
- [date(config?, ...tests)](#dateconfig-tests)
- [number(config?, ...tests)](#numberconfig-tests)
- [object(schema, config?, ...tests)](#objectschema-config-tests)
- [string(config?, ...tests)](#stringconfig-tests)

Every validation type, and every validator `optional()` returns, is also a [Standard Schema][standard-schema], so libraries that accept one can use it directly. See [createValidator(fn)](#createvalidatorfn) for how results map to issues. In TypeScript, their type is `TypeValidator<T, E>`: a `Validator<T, E>` with a `~standard` property.

#### array(itemTest?, config?, ...tests)

Casts value to an array, or keeps `null` or `undefined` if using the default array parser. `itemTest` is the validation type or test to be applied on each value within the array value. `config` is optional and comes after `itemTest`, as `object()`'s does. All remaining `tests` are applied to the array as a whole. Without `itemTest`, `array(config?)` keeps the items as they are and takes no tests.

A valid result's `value` holds each item as `itemTest` returned it, so `array(number())` turns `['1', '2.5']` into `[1, 2.5]`, and `array(string({ trim: true }))` trims each item.

Supported validation tests: `max` and `min`.

For invalid results, errors are in the `errors` property. It is an array of type:

```ts
type ArrayErrors = Array<string | null>;
```

Where valid entries are represented as `null` and invalid entries with the error message as a string.

<details><summary>config</summary>

| option            | type               | description                                                                             |
| :---------------- | :----------------- | :-------------------------------------------------------------------------------------- |
| `default`         | string             | Optional. Value used if the parser returns `undefined`, `null`, or an empty array `[]`. |
| `requiredMessage` | string or function | Optional. Message for a missing value. Defaults to `'Required.'`.                       |
| `parser`          | function           | Optional. Used to customize how a value is converted into an array.                     |

</details>

#### boolean(config?, ...tests)

Casts value to a boolean, or keeps `null` or `undefined` if using the default boolean parser. `config` is optional.

Supported validation tests: `oneOf`.

<details><summary>config</summary>

| option            | type               | description                                                          |
| :---------------- | :----------------- | :------------------------------------------------------------------- |
| `default`         | boolean            | Optional. Value used if the parser returns `undefined` or `null`.    |
| `requiredMessage` | string or function | Optional. Message for a missing value. Defaults to `'Required.'`.    |
| `parser`          | function           | Optional. Used to customize how a value is converted into a boolean. |

</details>

#### date(config?, ...tests)

Casts value to a date, or keeps `null` or `undefined` if using the default date parser. A string that isn't ISO 8601, such as `'tomorrow'`, and input that isn't a `Date`, number, or string, such as `true` or `{}`, give an invalid result with the message `Failed to parse value to date.`. A blank string and an invalid `Date` become an invalid date, which counts as missing. `config` is optional.

Supported validation tests: `maxDate`, `minDate`, and `oneOf`.

<details><summary>config</summary>

| option            | type               | description                                                                         |
| :---------------- | :----------------- | :---------------------------------------------------------------------------------- |
| `default`         | date               | Optional. Value used if the parser returns `undefined`, `null`, or an invalid date. |
| `requiredMessage` | string or function | Optional. Message for a missing value. Defaults to `'Required.'`.                   |
| `parser`          | function           | Optional. Used to customize how a value is converted into a date.                   |

The default parser only accepts dates, numbers, and a subset of [ISO 8601][iso8601] formatted strings (excludes week formats). If you want to allow other or more complex formats you should use a third-party library such as [date-fns][date-fns].

</details>

#### number(config?, ...tests)

Casts value to a number, or keeps `null` or `undefined` if using the default number parser. `config` is optional.

The default parser accepts numbers, bigints, dates (as their timestamp), strings that start with a number (read with `parseFloat`, so `'12px'` is `12`), and `Number` or `String` objects holding one. A blank string (`''` or only whitespace) gives `NaN`, which counts as missing and which `default` replaces. Any other input gives an invalid result with the message `Failed to parse value to number.`: strings without a leading number, such as `'abc'`, booleans, symbols, and objects other than the ones above, arrays and functions included.

Supported validation tests: `exact`, `integer`, `max`, `min`, and `oneOf`.

<details><summary>config</summary>

| option            | type               | description                                                                                |
| :---------------- | :----------------- | :----------------------------------------------------------------------------------------- |
| `default`         | number             | Optional. Value used if the parser returns `undefined`, `null` or an invalid number `NaN`. |
| `requiredMessage` | string or function | Optional. Message for a missing value. Defaults to `'Required.'`.                          |
| `parser`          | function           | Optional. Used to customize how a value is converted into a number.                        |

</details>

#### object(schema, config?, ...tests)

The only validation type that does not cast the entered value, meaning it does not use a parser. There's also no default fallback value option here. `config` is optional; when the second argument is a function, it's the first of the `tests`. A missing object, `undefined` or `null`, fails with `config.requiredMessage`, or `'Required.'`, without checking its fields. Instead, the schema is an object where its properties are validation types such as `string`, `array`, `number`, etc. Nested `object` validators are allowed, but not recommended due to their complexity and potential performance hit.

For invalid results, errors are in the `errors` property. It matches the provided object with the same keys and strings or string records as values that contain the error messages.

In TypeScript, a field of the valid value is required unless its validator is wrapped in `optional()`, as in `{ name: string; age?: number | null | undefined }`. A missing optional field is still set on the value, as `undefined`.

The remaining `tests` are object-level tests. They run in order on the parsed object, only once every property is valid, and the first failure becomes the result. Use [`check`](#checkpath-test-message) to compare fields and put the error on one of them:

```ts
const signup = object(
  {
    password: string(),
    confirm: string(),
  },
  check('confirm', (value) => value.confirm === value.password, 'Must match.'),
);

await signup({ password: 'secret', confirm: 'other' });
// { state: 'invalid', message: '', errors: { confirm: 'Must match.' }, ... }
```

A field's own error takes precedence: object-level tests don't run while any property is invalid, so they always compare valid, parsed values.

<details><summary>config</summary>

| option            | type               | description                                                        |
| :---------------- | :----------------- | :----------------------------------------------------------------- |
| `requiredMessage` | string or function | Optional. Message for a missing object. Defaults to `'Required.'`. |

</details>

To use this with a library such as [Formik][formik], you can use the resulting `errors` property. It is a key-value structure with the schema property keys and their validation errors if any. Besides that, the object validation results are the same as described above.

#### string(config?, ...tests)

Casts value to a string, or keeps `null` or `undefined` if using the default string parser. `config` is optional.

The default parser accepts strings, numbers, bigints, booleans, dates (as an ISO string), and `String`, `Number`, or `Boolean` objects. Any other object, including arrays and functions, and symbols give an invalid result with the message `Failed to parse value to string.`

Supported validation tests: `email`, `exact`, `matches`, `max`, `min`, `oneOf`, `url`, and `uuid`.

<details><summary>config</summary>

| option            | type               | description                                                                              |
| :---------------- | :----------------- | :--------------------------------------------------------------------------------------- |
| `trim`            | boolean            | Optional. If true, clears whitespace from the start and end of the string.               |
| `default`         | string             | Optional. Value used if the parser returns `undefined`, `null`, or an empty string `''`. |
| `requiredMessage` | string or function | Optional. Message for a missing value. Defaults to `'Required.'`.                        |
| `parser`          | function           | Optional. Used to customize how a value is converted into a string.                      |

</details>

### Validation tests

A **validation test** is a simplified version of a validation type. It accepts a value of a specific type and returns a promise that resolves to a validation result. Validation types only run tests on present values, so a built-in test fails `null` and `undefined` when it's called with them directly. An empty string is a string like any other: `min(1, …)` fails it and `max(1, …)` accepts it. You can use a validation test directly without the validation type, but it's not recommended as you lose the parsing step and you can't apply multiple tests to the same field as easily.

In TypeScript, a test's type is `Test<T, E>`, a function that takes a value of type `T`. A validation type takes tests on its value type: `string()` takes `min()`, which checks strings, numbers and arrays, but not a test on booleans. A custom test that takes `unknown` fits every validation type.

- [check(path?, test, message)](#checkpath-test-message)
- [email(message)](#emailmessage)
- [exact(limit, message)](#exactlimit-message)
- [integer(message)](#integermessage)
- [matches(pattern, message)](#matchespattern-message)
- [max(limit, message)](#maxlimit-message)
- [maxDate(limit, message)](#maxdatelimit-message)
- [min(limit, message)](#minlimit-message)
- [minDate(limit, message)](#mindatelimit-message)
- [oneOf(values, message)](#oneofvalues-message)
- [url(message, protocols?)](#urlmessage-protocols)
- [uuid(message)](#uuidmessage)

#### check(path?, test, message)

An object-level test for `object`. It fails when `test` returns `false` for the parsed object. With a `path`, the message is the error at that property in the object's `errors`; a list of names reaches into nested objects, such as `['shipping', 'zip']`. Without a `path`, the message is the object's own `message`. The parsed object is provided to the message as `value`.

In TypeScript, `path` is checked against the parsed object's type, so a misspelled property is a type error, and the test's error type is the errors it produces, such as `{ shipping?: { zip?: string } }`. A path ends at an array, a date or a function.

<details><summary>arguments</summary>

| name      | type               | description                                                       |
| :-------- | :----------------- | :---------------------------------------------------------------- |
| `path`    | string or string[] | Optional. The property, or the path into nested objects, to fail. |
| `test`    | function           | Gets the parsed object and returns `true` when it is valid.       |
| `message` | string or function | The validation error message.                                     |

</details>

#### email(message)

Ensures the value follows an email address format. Wraps the `matches` validation test. Works with strings.

<details><summary>arguments</summary>

| name      | type               | description                   |
| :-------- | :----------------- | :---------------------------- |
| `message` | string or function | The validation error message. |

</details>

#### exact(limit, message)

Ensures value is of an exact `amount`. Works with strings, arrays, and numbers. `limit` (aliased as `exact`) and `amount` (the string length, array length, or numeric value) are provided to the message.

<details><summary>arguments</summary>

| name      | type               | description                                                      |
| :-------- | :----------------- | :--------------------------------------------------------------- |
| `limit`   | number             | The exact string length, array length, or numeric value allowed. |
| `message` | string or function | The validation error message.                                    |

</details>

#### integer(message)

Ensures value is an integer number. Works with numbers.

<details><summary>arguments</summary>

| name      | type               | description                   |
| :-------- | :----------------- | :---------------------------- |
| `message` | string or function | The validation error message. |

</details>

#### matches(pattern, message)

Ensures value matches the specified pattern. Works with strings. `pattern` is provided to the message. The `g` and `y` flags carry no state between values: each test starts at index 0, and `pattern.lastIndex` is left unchanged.

<details><summary>arguments</summary>

| name      | type               | description                              |
| :-------- | :----------------- | :--------------------------------------- |
| `pattern` | regular expression | The regular expression to match against. |
| `message` | string or function | The validation error message.            |

</details>

#### max(limit, message)

Ensures value is of at most `limit`. Works with strings, arrays, and numbers. `limit` (aliased as `max`) and `amount` (string length, array length, or numeric value) are provided to the message. For a strict bound, use [`check()`](#checkpath-test-message), such as `check((value) => value < 10, 'Must be under 10.')`.

<details><summary>arguments</summary>

| name      | type               | description                                                        |
| :-------- | :----------------- | :----------------------------------------------------------------- |
| `limit`   | number             | The maximum string length, array length, or numeric value allowed. |
| `message` | string or function | The validation error message.                                      |

</details>

#### maxDate(limit, message)

Ensures value is on or before the specified date. Works with dates. `limit` (aliased as `max`) is provided to the message.

<details><summary>arguments</summary>

| name      | type                    | description                                              |
| :-------- | :---------------------- | :------------------------------------------------------- |
| `limit`   | date, number, or string | The maximum date allowed. Uses the internal date parser. |
| `message` | string or function      | The validation error message.                            |

</details>

#### min(limit, message)

Ensures value is of at least `limit`. Works with strings, arrays, and numbers. `limit` (aliased as `min`) and `amount` (string length, array length, or numeric value) are provided to the message. For a strict bound, use [`check()`](#checkpath-test-message), such as `check((value) => value > 0, 'Must be positive.')`.

<details><summary>arguments</summary>

| name      | type               | description                                                        |
| :-------- | :----------------- | :----------------------------------------------------------------- |
| `limit`   | number             | The minimum string length, array length, or numeric value allowed. |
| `message` | string or function | The validation error message.                                      |

</details>

#### minDate(limit, message)

Ensures value is on or after the specified date. Works with dates. `limit` (aliased as `min`) is provided to the message.

<details><summary>arguments</summary>

| name      | type                    | description                                              |
| :-------- | :---------------------- | :------------------------------------------------------- |
| `limit`   | date, number, or string | The minimum date allowed. Uses the internal date parser. |
| `message` | string or function      | The validation error message.                            |

</details>

#### oneOf(values, message)

Ensures value is one of the specified values. Works with strings, arrays, booleans, and dates. `values` is provided to the message.

<details><summary>arguments</summary>

| name      | type               | description                                                          |
| :-------- | :----------------- | :------------------------------------------------------------------- |
| `values`  | array              | List of allowed values. May be strings, numbers, booleans, or dates. |
| `message` | string or function | The validation error message.                                        |

</details>

#### url(message, protocols?)

Ensures value is a valid URL with an allowed protocol. Works with strings. `protocols` defaults to `['http:', 'https:']`, so `javascript:` and `data:` URLs, which can run script when used as a link, are invalid. A list replaces the default, so `['mailto:']` allows only `mailto:`. `protocols` is provided to the message.

<details><summary>arguments</summary>

| name        | type               | description                                                                        |
| :---------- | :----------------- | :--------------------------------------------------------------------------------- |
| `message`   | string or function | The validation error message.                                                      |
| `protocols` | array              | Allowed URL protocols, e.g. `https:`, `mailto:`. Defaults to `http:` and `https:`. |

</details>

#### uuid(message)

Ensures the value is a UUID as defined by [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562): any version from 1 to 8 with the RFC's variant, or the nil or max UUID. Case-insensitive. Braces, a `urn:uuid:` prefix, and missing hyphens are invalid. Wraps the `matches` validation test. Works with strings.

<details><summary>arguments</summary>

| name      | type               | description                   |
| :-------- | :----------------- | :---------------------------- |
| `message` | string or function | The validation error message. |

</details>

### Custom validation

Custom validation types and validators can be created and used as needed, with these helpers.

- [createValidator(fn)](#createvalidatorfn)
- [createTypeValidatorTest(defaultConfig, applyConfig)](#createtypevalidatortestdefaultconfig-applyconfig)
- [valid({ value, field })](#valid-value-field-)
- [invalid({ message, value, field, errors, extras })](#invalid-message-value-field-errors-extras-)

#### createValidator(fn)

Makes a custom validator from `fn`, an async function that takes a value and a field name and returns a result made with `valid()` or `invalid()`. The validator gives the same results as `fn`, works with `optional()` and inside `object()` and `array()`, and is a [Standard Schema][standard-schema] like the validation types. `fn` itself is unchanged. A validator that's already a Standard Schema from this library, such as `string()`, is returned as it is. In TypeScript, its type is `TypeValidator<T, E>`, with `T` and `E` inferred from `fn`'s return type.

`fn` must return a promise. A synchronous function is a type error.

```ts
const hello = createValidator(async (value, field) =>
  value === 'hello'
    ? valid({ value, field })
    : invalid({ message: 'Must be "hello".', value, field }),
);

await hello['~standard'].validate('hi');
// { issues: [{ message: 'Must be "hello".' }] }

const schema = object({ email: string(email('Must be an email.')) });
await schema['~standard'].validate({ email: 'nope' });
// { issues: [{ message: 'Must be an email.', path: ['email'] }] }
```

How a validator's results map to Standard Schema results:

- `validate` always returns a promise, because every validator here is async. Libraries that only accept synchronous schemas can't use it.
- A valid result gives `{ value }`, the parsed value. Its type is the validator's value type, which includes `null` and `undefined` only for `optional()` validators.
- An invalid result gives one issue per error message. Object keys and array indexes in `errors` form each issue's `path`, and a non-empty `message`, such as an array-level error, is an issue with no path. An error with no message gets `'Invalid value.'`.
- An `object` field that fails both an array-level test and item tests keeps only the array-level message, because `object` stores a field's message in place of its errors, so only that message becomes an issue.

#### createTypeValidatorTest(defaultConfig, applyConfig)

Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object the validator starts from. It must include a `parser` function, which returns a result as described in [Unreadable input and throws](#unreadable-input-and-throws), and the config type declares `parser` and any options, such as `requiredMessage`. The validator parses the input with the config's `parser`, then `applyConfig` gets the parsed value and the config, and returns the value to check. The resulting validator is required by default, takes `requiredMessage` in its config, works with `optional()`, and is a Standard Schema, like the built-in ones. Its return type is a `TypeValidator`.

The validation tests passed to the resulting validator report their errors as strings, as the built-in ones do; a test whose `errors` has another type is a type error.

In TypeScript, the value type and the config type are inferred from `applyConfig`, so the validator accepts options that `defaultConfig` doesn't set. Passing them as type arguments, as in `createTypeValidatorTest<number, MoneyConfig>(…)`, still works.

```ts
import {
  createTypeValidatorTest,
  invalid,
  type Result,
  valid,
  type ValidatorMessage,
} from 'validator-fns';

interface MoneyConfig {
  parser: (
    value: unknown,
    field?: string,
  ) => Promise<Result<number | null | undefined>>;
  requiredMessage?: ValidatorMessage<number>;
  /** Convert the amount to cents. */
  cents?: boolean;
}

/** Reads a number or a numeric string, and fails anything else present. */
async function parseAmount(
  value: unknown,
  field?: string,
): Promise<Result<number | null | undefined>> {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (typeof amount === 'number' || amount === null || amount === undefined) {
    return valid({ value: amount, field });
  }

  return invalid({ message: 'Must be an amount.', field });
}

function applyMoneyConfig(
  amount: number | null | undefined,
  config: MoneyConfig,
): number | null | undefined {
  return config.cents && typeof amount === 'number'
    ? Math.round(amount * 100)
    : amount;
}

const money = createTypeValidatorTest(
  { parser: parseAmount },
  applyMoneyConfig,
);

await money({ cents: true })('12.5');
// { state: 'valid', value: 1250, ... }
await money()(true);
// { state: 'invalid', message: 'Must be an amount.', ... }
```

#### valid({ value, field })

Formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property. In TypeScript, `value` has the validator's value type, so a custom validator that can return `null` or `undefined` needs them in that type.

#### invalid({ message, value, field, errors, extras })

Formats a failed validation result. `message` is a [validation error message](#validation-error-message), with `{keys}` replaced by `value`, `field` and `extras`. `value` is optional and only goes to the message; the result has no `value`. `field` is the same as above, `errors` is additional error details used by `array` and `object` validators, and `extras` are optional extra parameters that can be used in the message.

In TypeScript, a message function gets `value` as `unknown`, since `invalid()` takes any value. A message that reads extra parameters needs `extras` with them; without `extras`, it's a type error.

## Supported environments

Supports Node versions in active or maintenance LTS at release time. Dropping one waits for the next major release.

- Node.js 22 and later.
- TypeScript 5.4 and later, for the type declarations.
- Chrome and Edge 85+, Firefox 77+, and Safari 13.1+ (iOS 13.4+): the first versions with every feature below, per [MDN's browser compatibility data][bcd] 8.1.6.

To support older environments, transpile or polyfill these:

- `String.prototype.replaceAll` (ES2021)
- Optional catch binding (ES2019)
- Object spread (`...`, ES2018)
- `async`, `await` (ES2017)
- `Array.prototype.includes` (ES2016)
- `Promise`, `URL`, and the rest of ES2015

[npm]: https://www.npmjs.com/package/validator-fns
[docs]: #documentation
[github]: https://github.com/smonn/validator-fns
[standard-schema]: https://standardschema.dev
[yup]: https://github.com/jquense/yup
[bcd]: https://github.com/mdn/browser-compat-data
[date-fns]: https://date-fns.org
[formik]: https://formik.org
[iso8601]: https://en.wikipedia.org/wiki/ISO_8601
