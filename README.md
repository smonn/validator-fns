# validator-fns

![current version](https://img.shields.io/npm/v/validator-fns?color=%23369&label=current%20version) ![minified size](https://img.shields.io/bundlephobia/min/validator-fns?color=%23369) ![minified plus gzip size](https://img.shields.io/bundlephobia/minzip/validator-fns?color=%23369&label=minified%20plus%20gzip%20size) ![supported node version](https://img.shields.io/node/v/validator-fns?color=%23369&label=supported%20node%20version) ![included types](https://img.shields.io/npm/types/validator-fns?color=%23369&label=included%20types) ![license](https://img.shields.io/npm/l/validator-fns?color=%23369) ![dev dependencies](https://img.shields.io/librariesio/release/npm/validator-fns?color=%23369&label=dev%20dependencies) ![code coverage](https://img.shields.io/coveralls/github/smonn/validator-fns?color=%23369&label=code%20coverage) ![total downloads](https://img.shields.io/npm/dt/validator-fns?color=%23369&label=total%20downloads)

Small asynchronous validation library. Tries to be as small as possible and use no external dependencies. Note that this library does not include localized error messages. API inspired by [yup][yup]. Built using TypeScript and includes definition files. This library targets modern browsers only--configure your build accordingly.

[npm][npm] | [github][github]

<!-- toc -->

- [Install](#install)
- [Usage](#usage)
- [API Reference](#api-reference)
  - [Validation result](#validation-result)
  - [Validation error message](#validation-error-message)
  - [Date values](#date-values)
  - [Validation types](#validation-types)
  - [Validation tests](#validation-tests)
  - [Custom validation](#custom-validation)
  - [Deprecations](#deprecations)
- [Supported environments](#supported-environments)

<!-- tocstop -->

## Install

```sh
npm install validator-fns
# or
yarn add validator-fns
```

## Usage

This is a fairly exhaustive example of what's possible with `validator-fns`.

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
  required,
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
  firstName: string(
    { default: '', trim: true },
    required('First name is required.'),
  ),
  emailAddress: string(
    required('Email address is required.'),
    email('Must be a valid email address.'),
  ),
  age: number(
    { round: 'floor' },
    required('Age is required.'),
    integer('Age must be a whole number.'),
    min(18, 'Must be at least {min} years old.'),
  ),
  homepage: string(url('Must be a valid URL.', ['http:', 'https:'])),
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
      required('Car brand is required.'),
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
  startDate: date(
    minDate(now, 'Must be on or after today.'),
    maxDate(tenDaysFromNow, 'Must be at most ten days from now.'),
  ),
  optIn: boolean(required('Must decide to opt in or out.')),
  notRobot: number(
    required('Must enter the correct answer.'),
    exact(42, 'This is the answer.'),
  ),
  postalCode: string(matches(/^[0-9]{5}$/, 'Must be a five-digit number.')),
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

## API Reference

### Validation result

All validation tests yield one of two results: `valid` and `invalid`. Both are objects.

| property      | type    | description                                                                |
| :------------ | :------ | :------------------------------------------------------------------------- |
| `state`       | string  | Either `valid` or `invalid`.                                               |
| `field`       | string  | Either the field name or `undefined`.                                      |
| `value`       | any     | The parsed value.                                                          |
| `message`     | string  | The error message unless `state` is `valid`.                               |
| `errors`      | any     | Only if `state` is `invalid` and using the `object` or `array` validators. |
| ~~`isValid`~~ | boolean | Deprecated. Use `state` instead.                                           |

In TypeScript, a result is a `Result`: either `Valid` or `Failure`. A validator is a `Validator`. The older names `ValidatorResult`, `ValidResult`, `InvalidResult` and `ValidatorTest` are deprecated.

### Validation error message

The `message` argument in the validation tests must be a static string, a template string, or a function returning a string.

| type            | example                                                                                |
| :-------------- | :------------------------------------------------------------------------------------- |
| static string   | `'Username is required.'`                                                              |
| template string | `'Password must be at least {min} characters.'`                                        |
| function        | `` ({ value, field, max }) => `${field} must be less than ${max} but was ${value}.` `` |

The parsed `value` is always provided. If available, `field` is also provided. Depending on the validator, additional fields may be available.

### Date values

Wherever a value or a limit is a `Date`, the library reads its timestamp and ISO text through `Date.prototype.getTime` and `Date.prototype.toISOString`. So `number()`, `string()`, the `default` fallback of `date()`, `minDate`, `maxDate`, `oneOf`, and `required` ignore a date's own or subclass `getTime`, `valueOf`, and `toISOString`. A date from another realm, such as an iframe or `vm.runInNewContext()`, counts as a date. An object that only inherits from `Date.prototype`, a `Proxy` around a date, and a date whose prototype was set to `Object.prototype` or `null` don't.

### Validation types

A **validation type** is expected to parse and prepare the value for the provided validation tests. For example, the `string` validation type ensures the provided value is a string, `null` or `undefined`. It must be a function that takes a value of any type and returns a promise which resolves to a validation result (see above).

- [array(config?, itemTest, ...tests)](#arrayconfig-itemtest-tests)
- [boolean(config?, ...tests)](#booleanconfig-tests)
- [date(config?, ...tests)](#dateconfig-tests)
- [number(config?, ...tests)](#numberconfig-tests)
- [object(schema, ...tests)](#objectschema-tests)
- [string(config?, ...tests)](#stringconfig-tests)

#### array(config?, itemTest, ...tests)

Casts value to an array, `null` or `undefined` if using the default date parser. `config` is optional. `itemTest` is the validation type or test to be applied on each value within the array value. All remaining `tests` are applied to the array as a whole.

A valid result's `value` holds each item as `itemTest` returned it, so `array(number())` turns `['1', '2.5']` into `[1, 2.5]`, and `array(string({ trim: true }))` trims each item.

Supported validation tests: `max`, `min`, and `required`.

For invalid results, errors are in the `errors` property. It is an array of type:

```ts
type ArrayErrors = Array<string | null>;
```

Where valid entries are represented as `null` and invalid entries with the error message as a string.

<details><summary>config</summary>

| option       | type     | description                                                                             |
| :----------- | :------- | :-------------------------------------------------------------------------------------- |
| `default`    | string   | Optional. Value used if the parser returns `undefined`, `null`, or an empty array `[]`. |
| ~~`parser`~~ | function | Deprecated. v3 removes it. In v3, use `createTypeValidator(parser)` instead.            |

</details>

#### boolean(config?, ...tests)

Casts value to a boolean, `null` or `undefined` if using the default boolean parser. `config` is optional.

Supported validation tests: `oneOf` and `required`.

<details><summary>config</summary>

| option       | type     | description                                                                  |
| :----------- | :------- | :--------------------------------------------------------------------------- |
| `default`    | boolean  | Optional. Value used if the parser returns `undefined` or `null`.            |
| ~~`parser`~~ | function | Deprecated. v3 removes it. In v3, use `createTypeValidator(parser)` instead. |

</details>

#### date(config?, ...tests)

Casts value to a date, `null` or `undefined` if using the default date parser. `config` is optional. See [Date values](#date-values) for which values count as dates.

Supported validation tests: `maxDate`, `minDate`, `oneOf`, and `required`.

<details><summary>config</summary>

| option       | type     | description                                                                         |
| :----------- | :------- | :---------------------------------------------------------------------------------- |
| `default`    | date     | Optional. Value used if the parser returns `undefined`, `null`, or an invalid date. |
| ~~`parser`~~ | function | Deprecated. v3 removes it. In v3, use `createTypeValidator(parser)` instead.        |

The default parser only accepts dates, numbers, and a subset of [ISO 8601][iso8601] formatted strings (excludes week formats). If you want to allow other or more complex formats you should use a third-party library such as [date-fns][date-fns].

</details>

#### number(config?, ...tests)

Casts value to a number, `null` or `undefined` if using the default number parser. `config` is optional. A date becomes its timestamp; see [Date values](#date-values).

Supported validation tests: `exact`, `integer`, `max`, `min`, `oneOf`, and `required`.

<details><summary>config</summary>

| option       | type     | description                                                                                                                                        |
| :----------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~`round`~~  | string   | Deprecated. Rounding method to use, one of `nearest`, `ceil`, `floor`. v3 removes it. Use `integer()` instead, or, in v3, `transform(Math.round)`. |
| `default`    | number   | Optional. Value used if the parser returns `undefined`, `null` or an invalid number `NaN`.                                                         |
| ~~`parser`~~ | function | Deprecated. v3 removes it. In v3, use `createTypeValidator(parser)` instead.                                                                       |

</details>

#### object(schema, ...tests)

The only validation type that does not cast the entered value, meaning it does not use a parser. There's also no default fallback value option here. Instead, the schema is an object where its properties are validation types such as `string`, `array`, `number`, etc. Nested `object` validators are allowed, but not recommended due to their complexity and potential performance hit.

For invalid results, errors are in the `errors` property. It matches the provided object with the same keys and strings or string records as values that contain the error messages.

The remaining `tests` are object-level tests. They run in order on the parsed object, only once every property is valid, and the first failure becomes the result. Use [`check`](#checkpath-test-message) to compare fields and put the error on one of them:

```ts
const signup = object(
  {
    password: string(required('Required.')),
    confirm: string(required('Required.')),
  },
  check('confirm', (value) => value.confirm === value.password, 'Must match.'),
);

await signup({ password: 'secret', confirm: 'other' });
// { state: 'invalid', message: '', errors: { confirm: 'Must match.' }, ... }
```

A field's own error takes precedence: object-level tests don't run while any property is invalid, so they always compare valid, parsed values.

To use this with a library such as [Formik][formik], you can use the resulting `errors` property. It is a key-value structure with the schema property keys and their validation errors if any. Besides that, the object validation results are the same as described above.

#### string(config?, ...tests)

Casts value to a string, `null` or `undefined` if using the default string parser. `config` is optional. A date becomes its ISO text; see [Date values](#date-values).

Supported validation tests: `email`, `exact`, `matches`, `max`, `min`, `oneOf`, `required`, `url`, and `uuid`.

<details><summary>config</summary>

| option       | type     | description                                                                                                                                  |
| :----------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~`trim`~~   | boolean  | Deprecated. If true, clears whitespace from the start and end of the string. v3 removes it. In v3, use `transform((s) => s.trim())` instead. |
| `default`    | string   | Optional. Value used if the parser returns `undefined`, `null`, or an empty string `''`.                                                     |
| ~~`parser`~~ | function | Deprecated. v3 removes it. In v3, use `createTypeValidator(parser)` instead.                                                                 |

</details>

### Validation tests

A **validation test** is a simplified version of a validation type. It accepts a value of a specific type including `null` and `undefined` and then returns a promise that resolves to a validation result. You can use a validation test directly without the validation type, but it's not recommended as you lose the parsing step and you can't apply multiple tests to the same field as easily.

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
- [required(message, nullable?)](#requiredmessage-nullable)
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

Ensures value is of an exact `amount`. Works with strings, arrays, and numbers. `exact` (also as the deprecated `limit`) and `amount` (the string length, array length, or numeric value) are provided to the message.

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

Ensures value is of at most `limit`. Works with strings, arrays, and numbers. `max` (also as the deprecated `limit`), `amount` (string length, array length, or numeric value), and the deprecated `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name            | type               | description                                                                                                                     |
| :-------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `limit`         | number             | The maximum string length, array length, or numeric value allowed.                                                              |
| `message`       | string or function | The validation error message.                                                                                                   |
| ~~`exclusive`~~ | boolean            | Deprecated. If true, makes comparison exclusive instead of the default, inclusive. v3 removes it. In v3, use `check()` instead. |

</details>

#### maxDate(limit, message, exclusive?)

Ensures value is on or before the specified date. Works with dates, compared by timestamp; see [Date values](#date-values). `max` (also as the deprecated `limit`) and the deprecated `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name            | type                    | description                                                                                                                     |
| :-------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `limit`         | date, number, or string | The maximum date allowed. Uses the internal date parser.                                                                        |
| `message`       | string or function      | The validation error message.                                                                                                   |
| ~~`exclusive`~~ | boolean                 | Deprecated. If true, makes comparison exclusive instead of the default, inclusive. v3 removes it. In v3, use `check()` instead. |

</details>

#### min(limit, message, exclusive?)

Ensures value is of at least `limit`. Works with strings, arrays, and numbers. `min` (also as the deprecated `limit`), `amount` (string length, array length, or numeric value), and the deprecated `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name            | type               | description                                                                                                                     |
| :-------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `limit`         | number             | The minimum string length, array length, or numeric value allowed.                                                              |
| `message`       | string or function | The validation error message.                                                                                                   |
| ~~`exclusive`~~ | boolean            | Deprecated. If true, makes comparison exclusive instead of the default, inclusive. v3 removes it. In v3, use `check()` instead. |

</details>

#### minDate(limit, message, exclusive?)

Ensures value is on or after the specified date. Works with dates, compared by timestamp; see [Date values](#date-values). `min` (also as the deprecated `limit`) and the deprecated `exclusive` are provided to the message.

<details><summary>arguments</summary>

| name            | type                    | description                                                                                                                     |
| :-------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `limit`         | date, number, or string | The minimum date allowed. Uses the internal date parser.                                                                        |
| `message`       | string or function      | The validation error message.                                                                                                   |
| ~~`exclusive`~~ | boolean                 | Deprecated. If true, makes comparison exclusive instead of the default, inclusive. v3 removes it. In v3, use `check()` instead. |

</details>

#### oneOf(values, message)

Ensures value is one of the specified values. Works with strings, arrays, booleans, and dates. A date matches a listed date or number with the same timestamp; see [Date values](#date-values). `values` is provided to the message.

<details><summary>arguments</summary>

| name      | type               | description                                                          |
| :-------- | :----------------- | :------------------------------------------------------------------- |
| `values`  | array              | List of allowed values. May be strings, numbers, booleans, or dates. |
| `message` | string or function | The validation error message.                                        |

</details>

#### required(message, nullable?)

> **Deprecated.** v3 removes `required()`: v3 validators are required by default, and `optional()` wraps the others.

Ensures value is **not** one of: `undefined`, `null`, `NaN`, an empty string, or an invalid date. Works with all types. See [Date values](#date-values) for which values count as dates.

<details><summary>arguments</summary>

| name       | type               | description                       |
| :--------- | :----------------- | :-------------------------------- |
| `message`  | string or function | The validation error message.     |
| `nullable` | boolean            | Optional. If true, allows `null`. |

</details>

#### url(message, protocols?)

Ensures value is a valid URL. Works with strings. `protocols` is provided to the message.

> **Warning:** without `protocols`, any URL that the `URL` constructor parses is valid, including `javascript:` and `data:` URLs, which can run script when used as a link. Pass `['http:', 'https:']` for values you render as links. The default is planned to change to `http:` and `https:` in v3 ([#521](https://github.com/smonn/validator-fns/issues/521)).

<details><summary>arguments</summary>

| name        | type               | description                                              |
| :---------- | :----------------- | :------------------------------------------------------- |
| `message`   | string or function | The validation error message.                            |
| `protocols` | array              | List of allowed URL protocols, e.g. `https:`, `mailto:`. |

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

> **Deprecated.** v3 removes `formatMessage()`. `invalid()` and `createValidatorTest()` format messages.

Formats a string for use as an error message. `template` can be a plain string with `{keys}` replaced by the `params` or a function that returns a string and accepts `params` as a parameter.

#### createTypeValidatorTest(defaultConfig, applyConfig)

> **Deprecated.** v3 removes `createTypeValidatorTest()`, `ConfigBase` and the `parser` option. In v3, use `createTypeValidator(parser)` instead, with `coerce.number()` in place of `parseNumber`.

Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object that the `applyConfig` function will use when parsing the value being validated. At least this should include a `parser` function.

In TypeScript, pass the value type and the config type as type arguments. TypeScript 5.6 and later infer the config type from `defaultConfig` alone, so without them the validator rejects options that `defaultConfig` doesn't set.

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

const money = createTypeValidatorTest<number, MoneyConfig>(
  { parser: parseNumber },
  applyMoneyConfig,
);

const result = await money({ cents: true })('12.5');
// { state: 'valid', value: 1250, ... }
```

#### valid({ value, field })

Formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property.

#### invalid({ message, value, field, errors, extras })

Formats a failed validation result. `message` is the same as the `formatMessage`'s template. `value` and `field` is the same as above, `errors` is additional error details used by `array` and `object` validators, and `extras` are optional extra parameters that can be used in the message.

#### standard(validator)

> **Deprecated.** v3 removes `standard()`. In v3, built-in validators are Standard Schemas, and `createValidator(fn)` makes custom ones.

Adds the [Standard Schema][standard-schema] interface to a validator, for libraries that accept any Standard Schema. It returns a new validator with a `~standard` property and leaves the one passed in unchanged.

```ts
const schema = standard(object({ email: string(email('Must be an email.')) }));

await schema['~standard'].validate({ email: 'nope' });
// { issues: [{ message: 'Must be an email.', path: ['email'] }] }
```

- `validate` always returns a promise, because every validator here is async. Libraries that only accept synchronous schemas can't use it.
- A valid result gives `{ value }`, the parsed value. Its type is the validator's value type or `null` or `undefined`, as in a valid result.
- An invalid result gives one issue per error message. Object keys and array indexes in `errors` form each issue's `path`, and a non-empty `message`, such as an array-level error, is an issue with no path. An error with no message gets `'Invalid value.'`.
- An `object` field that fails both an array-level test and item tests keeps only the array-level message, because `object` stores a field's message in place of its errors, so only that message becomes an issue.

### Deprecations

Everything that v3 removes is deprecated in 2.x. TypeScript-aware editors cross out deprecated functions, types and arguments where you use them, and show the replacement on hover. Replacements marked "in v3" exist only in v3.

| Deprecated                                                                                                            | Replacement                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `applyArrayConfig`, `applyBooleanConfig`, `applyDateConfig`, `applyNumberConfig`, `applyStringConfig`                 | None                                                                                         |
| `parseArray`, `parseBoolean`, `parseNumber`, `parseString`, `parseDate`, `invalidDate`                                | In v3, `coerce.number()`, `coerce.boolean()` and `coerce.date()` for text input              |
| `hasOwnProperty`, `isObject`                                                                                          | `Object.hasOwn()`, or a plain check of your own                                              |
| `formatMessage`                                                                                                       | `invalid()` and `createValidatorTest()` format messages                                      |
| `createTypeValidatorTest`, the `parser` option                                                                        | In v3, `createTypeValidator(parser)`                                                         |
| `DeepPartial`, `ValidatorFactory`, `SharedValueType`, `SharedDateValueType`, `ConfigBase`, `ArrayItemValidatorResult` | None                                                                                         |
| `required()`                                                                                                          | In v3, validators are required by default, and `optional()` wraps the others                 |
| `standard()`                                                                                                          | In v3, built-in validators are Standard Schemas, and `createValidator(fn)` makes custom ones |
| The `round` option                                                                                                    | `integer()`, or in v3, `transform(Math.round)`                                               |
| The `exclusive` argument of `min`, `max`, `minDate` and `maxDate`, and its message parameter                          | In v3, `check()`, such as `check((n) => n > 0, message)`                                     |
| The `trim` option                                                                                                     | In v3, `transform((s) => s.trim())`                                                          |
| The `limit` message parameter                                                                                         | `min`, `max` or `exact`                                                                      |
| `ValidatorResult`, `ValidResult`, `InvalidResult`                                                                     | `Result`, `Valid`, `Failure`                                                                 |
| `ValidatorTest`                                                                                                       | `Validator`                                                                                  |

## Supported environments

- Node.js 18 and later.
- Chrome and Edge 85+, Firefox 77+, and Safari 13.1+ (iOS 13.4+): the first versions with every feature below, per [MDN's browser compatibility data][bcd] 8.1.6.

To support older environments, transpile or polyfill these:

- `String.prototype.replaceAll` (ES2021)
- Nullish coalescing (`??`, ES2020)
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
