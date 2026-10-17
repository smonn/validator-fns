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

function customValidator(value, field) {
  if (value === 'hello') {
    return valid({ value, field });
  }
  return invalid({
    message: 'Must be "hello".',
    value,
    field,
  });
}

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
    { round: 'floor', requiredMessage: 'Age is required.' },
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
    { default: [] },
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
   number({ round: 'floor' }, required('Enter your age.'));
   array(string(), required('Pick some.'));

   // 3.x
   string({ requiredMessage: 'Enter a name.' }, min(2, 'Too short.'));
   number({ round: 'floor', requiredMessage: 'Enter your age.' });
   array({ requiredMessage: 'Pick some.' }, string());
   ```

2. **Wrap each validator that had no `required()` in `optional()`**, or it now rejects a missing value:

   ```js
   // 2.x
   string(email('Must be an email.'));

   // 3.x
   optional(string(email('Must be an email.')));
   ```

3. **Replace `required(message, true)`** (nullable): `optional()` accepts `null`, as well as the other missing values.
4. **Check `object()` calls with a second argument**: it's a config object or the first object-level test, as in `object(schema, { requiredMessage }, ...tests)`. A missing object now fails with its `requiredMessage` instead of reporting each field as missing; wrap it in `optional()` to accept one.
5. **In TypeScript**, a valid result's `value` no longer includes `null` or `undefined` unless the validator is wrapped in `optional()`, and `object()` makes only `optional()` keys optional. `valid()` takes a value of the validator's type, so a custom validator that returns `null` or `undefined` needs them in its type, such as `ValidatorTest<string | undefined>`.

## API Reference

### Validation result

All validation tests yield one of two results: `valid` and `invalid`. Both are objects. In TypeScript the result is `ValidatorResult<T, E>` and a validation test is `ValidatorTest<T, E>`, where `T` is the value type and `E` the `errors` type. Both default to `unknown`.

| property  | type   | description                                                                |
| :-------- | :----- | :------------------------------------------------------------------------- |
| `state`   | string | Either `valid` or `invalid`.                                               |
| `field`   | string | Either the field name or `undefined`.                                      |
| `value`   | `T`    | The parsed value.                                                          |
| `message` | string | The error message unless `state` is `valid`.                               |
| `errors`  | `E`    | Only if `state` is `invalid` and using the `object` or `array` validators. |

### Validation error message

The `message` argument in the validation tests must be a static string, a template string, or a function returning a string.

| type            | example                                                                                |
| :-------------- | :------------------------------------------------------------------------------------- |
| static string   | `'Username is required.'`                                                              |
| template string | `'Password must be at least {min} characters.'`                                        |
| function        | `` ({ value, field, max }) => `${field} must be less than ${max} but was ${value}.` `` |

The parsed `value` is always provided. If available, `field` is also provided. Depending on the validator, additional fields may be available.

### Required and optional values

Every validation type rejects a missing value: `undefined`, `null`, an empty string `''`, `NaN`, or an invalid date. It checks after parsing and `default`, so `string({ trim: true })` treats `'  '` as missing, `number()` treats a blank string as missing, and a `default` fills a missing value before the check. The tests only run on present values.

The message is `'Required.'` unless the config sets `requiredMessage`, which takes a [validation error message](#validation-error-message):

```js
await string()('');
// { state: 'invalid', message: 'Required.', value: '', ... }

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

### Validation types

A **validation type** is expected to parse and prepare the value for the provided validation tests. For example, the `string` validation type ensures the provided value is a string, and rejects a missing value unless wrapped in [`optional()`](#optionalvalidator). It must be a function that takes a value of any type and returns a promise which resolves to a validation result (see above).

- [array(config?, itemTest, ...tests)](#arrayconfig-itemtest-tests)
- [boolean(config?, ...tests)](#booleanconfig-tests)
- [date(config?, ...tests)](#dateconfig-tests)
- [number(config?, ...tests)](#numberconfig-tests)
- [object(schema, config?, ...tests)](#objectschema-config-tests)
- [string(config?, ...tests)](#stringconfig-tests)

Every validation type, and every validator `optional()` returns, is also a [Standard Schema][standard-schema], so libraries that accept one can use it directly. See [standard(validator)](#standardvalidator) for how results map to issues. In TypeScript, their type is `TypeValidator<T, E>`: a `ValidatorTest<T, E>` with a `~standard` property.

#### array(config?, itemTest, ...tests)

Casts value to an array, or keeps `null` or `undefined` if using the default array parser. `config` is optional. `itemTest` is the validation type or test to be applied on each value within the array value. All remaining `tests` are applied to the array as a whole.

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
| `parser`          | function           | Optional. Used to customize how a value is converted into a string.                     |

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

Casts value to a date, or keeps `null` or `undefined` if using the default date parser. An input the parser can't read becomes an invalid date, which counts as missing. `config` is optional.

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
| `round`           | string             | Optional. Rounding method to use, one of `nearest`, `ceil`, `floor`                        |
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

A **validation test** is a simplified version of a validation type. It accepts a value of a specific type and returns a promise that resolves to a validation result. Validation types only run tests on present values; called directly, the built-in tests pass `null` and `undefined` through. You can use a validation test directly without the validation type, but it's not recommended as you lose the parsing step and you can't apply multiple tests to the same field as easily.

- [check(path?, test, message)](#checkpath-test-message)
- [email(message)](#emailmessage)
- [exact(limit, message)](#exactlimit-message)
- [integer(message)](#integermessage)
- [matches(pattern, message)](#matchespattern-message)
- [max(limit, message, exclusive?)](#maxlimit-message-exclusive)
- [maxDate(limit, message, exclusive?)](#maxdatelimit-message-exclusive)
- [min(limit, message, exclusive?)](#minlimit-message-exclusive)
- [minDate(limit, message, exclusive?)](#mindatelimit-message-exclusive)
- [oneOf(values, message)](#oneofvalues-message)
- [url(message, protocols?)](#urlmessage-protocols)
- [uuid(message)](#uuidmessage)

#### check(path?, test, message)

An object-level test for `object`. It fails when `test` returns `false` for the parsed object. With a `path`, the message is the error at that property in the object's `errors`; a list of names reaches into nested objects, such as `['shipping', 'zip']`. Without a `path`, the message is the object's own `message`. The parsed object is provided to the message as `value`.

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

#### max(limit, message, exclusive?)

Ensures value is of at most `limit`. Works with strings, arrays, and numbers. `limit` (aliased as `min`), `amount` (string length, array length, or numeric value), and `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name        | type               | description                                                                      |
| :---------- | :----------------- | :------------------------------------------------------------------------------- |
| `limit`     | number             | The maximum string length, array length, or numeric value allowed.               |
| `message`   | string or function | The validation error message.                                                    |
| `exclusive` | boolean            | Optional. If true, makes comparison exclusive instead of the default, inclusive. |

</details>

#### maxDate(limit, message, exclusive?)

Ensures value is on or before the specified date. Works with dates. `limit` (aliased as `max`) and `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name        | type                    | description                                                                      |
| :---------- | :---------------------- | :------------------------------------------------------------------------------- |
| `limit`     | date, number, or string | The maximum date allowed. Uses the internal date parser.                         |
| `message`   | string or function      | The validation error message.                                                    |
| `exclusive` | boolean                 | Optional. If true, makes comparison exclusive instead of the default, inclusive. |

</details>

#### min(limit, message, exclusive?)

Ensures value is of at least `limit`. Works with strings, arrays, and numbers. `limit` (aliased as `min`), `amount` (string length, array length, or numeric value), and `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name        | type               | description                                                                      |
| :---------- | :----------------- | :------------------------------------------------------------------------------- |
| `limit`     | number             | The minimum string length, array length, or numeric value allowed.               |
| `message`   | string or function | The validation error message.                                                    |
| `exclusive` | boolean            | Optional. If true, makes comparison exclusive instead of the default, inclusive. |

</details>

#### minDate(limit, message, exclusive?)

Ensures value is on or after the specified date. Works with dates. `limit` (aliased as `min`) and `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name        | type                    | description                                                                      |
| :---------- | :---------------------- | :------------------------------------------------------------------------------- |
| `limit`     | date, number, or string | The minimum date allowed. Uses the internal date parser.                         |
| `message`   | string or function      | The validation error message.                                                    |
| `exclusive` | boolean                 | Optional. If true, makes comparison exclusive instead of the default, inclusive. |

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

Custom validation types and validators can be created and used as needed. There are some helpers that, while used internally, are considered part of the public API.

- [formatMessage(template, params)](#formatmessagetemplate-params)
- [createTypeValidatorTest(defaultConfig, applyConfig)](#createtypevalidatortestdefaultconfig-applyconfig)
- [valid({ value, field })](#valid-value-field-)
- [invalid({ message, value, field, errors, extras })](#invalid-message-value-field-errors-extras-)
- [standard(validator)](#standardvalidator)

#### formatMessage(template, params)

Formats a string for use as an error message. `template` can be a plain string with `{keys}` replaced by the `params` or a function that returns a string and accepts `params` as a parameter.

#### createTypeValidatorTest(defaultConfig, applyConfig)

Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object that the `applyConfig` function will use when parsing the value being validated. At least this should include a `parser` function. The resulting validator is required by default, takes `requiredMessage` in its config, works with `optional()`, and is a Standard Schema, like the built-in ones. Its return type is a `TypeValidator`, which is still a `ValidatorTest`, so factories typed with `ValidatorFactory` keep working.

The validation tests passed to the resulting validator report their errors as strings, as the built-in ones do; a test whose `errors` has another type is a type error.

In TypeScript, the value type and the config type are inferred from `applyConfig`, so the validator accepts options that `defaultConfig` doesn't set. Passing them as type arguments, as in `createTypeValidatorTest<number, MoneyConfig>(…)`, still works.

```ts
import {
  type ConfigBase,
  createTypeValidatorTest,
  parseNumber,
} from 'validator-fns';

interface MoneyConfig extends ConfigBase<number> {
  /** Convert the amount to cents. */
  cents?: boolean;
}

function applyMoneyConfig(
  value: unknown,
  config: MoneyConfig,
): number | null | undefined {
  const amount = config.parser(value);
  return config.cents && typeof amount === 'number'
    ? Math.round(amount * 100)
    : amount;
}

const money = createTypeValidatorTest(
  { parser: parseNumber },
  applyMoneyConfig,
);

const result = await money({ cents: true })('12.5');
// { state: 'valid', value: 1250, ... }
```

#### valid({ value, field })

Formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property. In TypeScript, `value` has the validator's value type, so a custom validator that can return `null` or `undefined` needs them in that type.

#### invalid({ message, value, field, errors, extras })

Formats a failed validation result. `message` is the same as the `formatMessage`'s template. `value` and `field` is the same as above, `errors` is additional error details used by `array` and `object` validators, and `extras` are optional extra parameters that can be used in the message.

#### standard(validator)

Adds the [Standard Schema][standard-schema] interface to a custom validator, for libraries that accept any Standard Schema. It returns a new validator with a `~standard` property and leaves the one passed in unchanged. Validation types already have the interface, so `standard()` returns them as they are.

```ts
const schema = object({ email: string(email('Must be an email.')) });

await schema['~standard'].validate({ email: 'nope' });
// { issues: [{ message: 'Must be an email.', path: ['email'] }] }

const custom = standard(async (value, field) => valid({ value, field }));
```

- `validate` always returns a promise, because every validator here is async. Libraries that only accept synchronous schemas can't use it.
- A valid result gives `{ value }`, the parsed value. Its type is the validator's value type, which includes `null` and `undefined` only for `optional()` validators.
- An invalid result gives one issue per error message. Object keys and array indexes in `errors` form each issue's `path`, and a non-empty `message`, such as an array-level error, is an issue with no path. An error with no message gets `'Invalid value.'`.
- An `object` field that fails both an array-level test and item tests keeps only the array-level message, because `object` stores a field's message in place of its errors, so only that message becomes an issue.

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
