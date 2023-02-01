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
    required('First name is required.')
  ),
  emailAddress: string(
    required('Email address is required.'),
    email('Must be a valid email address.')
  ),
  age: number(
    { round: 'floor' },
    required('Age is required.'),
    integer('Age must be a whole number.'),
    min(18, 'Must be at least {min} years old.')
  ),
  homepage: string(url('Must be a valid URL.', ['http:', 'https:'])),
  fruit: string(
    { default: 'apple' },
    oneOf(
      ['apple', 'orange', 'banana'],
      ({ values }) => `Must be ${values[0]}, ${values[1]} or ${values[2]}.`
    )
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
        'Must be a known car brand.'
      )
    ),
    min(2, 'Must pick at least two.'),
    max(4, 'Must pick at most four.')
  ),
  startDate: date(
    minDate(now, 'Must be on or after today.'),
    maxDate(tenDaysFromNow, 'Must be at most ten days from now.')
  ),
  optIn: boolean(required('Must decide to opt in or out.')),
  notRobot: number(
    required('Must enter the correct answer.'),
    exact(42, 'This is the answer.')
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

### Validation error message

The `message` argument in the validation tests must be a static string, a template string, or a function returning a string.

| type            | example                                                                                |
| :-------------- | :------------------------------------------------------------------------------------- |
| static string   | `'Username is required.'`                                                              |
| template string | `'Password must be at least {min} characters.'`                                        |
| function        | `` ({ value, field, max }) => `${field} must be less than ${max} but was ${value}.` `` |

The parsed `value` is always provided. If available, `field` is also provided. Depending on the validator, additional fields may be available.

### Validation types

A **validation type** is expected to parse and prepare the value for the provided validation tests. For example, the `string` validation type ensures the provided value is a string, `null` or `undefined`. It must be a function that takes a value of any type and returns a promise which resolves to a validation result (see above).

- [array(config?, itemTest, ...tests)](#arrayconfig-itemtest-tests)
- [boolean(config?, ...tests)](#booleanconfig-tests)
- [date(config?, ...tests)](#dateconfig-tests)
- [number(config?, ...tests)](#numberconfig-tests)
- [object(schema)](#objectschema)
- [string(config?, ...tests)](#stringconfig-tests)

#### array(config?, itemTest, ...tests)

Casts value to an array, `null` or `undefined` if using the default date parser. `config` is optional. `itemTest` is the validation type or test to be applied on each value within the array value. All remaining `tests` are applied to the array as a whole.

Supported validation tests: `max`, `min`, and `required`.

For invalid results, errors are in the `errors` property. It is an array of type:

```ts
type ArrayErrors = Array<string | null>;
```

Where valid entries are represented as `null` and invalid entries with the error message as a string.

<details><summary>config</summary>

| option    | type     | description                                                                             |
| :-------- | :------- | :-------------------------------------------------------------------------------------- |
| `default` | string   | Optional. Value used if the parser returns `undefined`, `null`, or an empty array `[]`. |
| `parser`  | function | Optional. Used to customize how a value is converted into a string.                     |

</details>

#### boolean(config?, ...tests)

Casts value to a boolean, `null` or `undefined` if using the default boolean parser. `config` is optional.

Supported validation tests: `oneOf` and `required`.

<details><summary>config</summary>

| option    | type     | description                                                          |
| :-------- | :------- | :------------------------------------------------------------------- |
| `default` | boolean  | Optional. Value used if the parser returns `undefined` or `null`.    |
| `parser`  | function | Optional. Used to customize how a value is converted into a boolean. |

</details>

#### date(config?, ...tests)

Casts value to a date, `null` or `undefined` if using the default date parser. `config` is optional.

Supported validation tests: `maxDate`, `minDate`, `oneOf`, and `required`.

<details><summary>config</summary>

| option    | type     | description                                                                         |
| :-------- | :------- | :---------------------------------------------------------------------------------- |
| `default` | date     | Optional. Value used if the parser returns `undefined`, `null`, or an invalid date. |
| `parser`  | function | Optional. Used to customize how a value is converted into a date.                   |

The default parser only accepts dates, numbers, and a subset of [ISO 8601][iso8601] formatted strings (excludes week formats). If you want to allow other or more complex formats you should use a third-party library such as [date-fns][date-fns].

</details>

#### number(config?, ...tests)

Casts value to a number, `null` or `undefined` if using the default number parser. `config` is optional.

Supported validation tests: `exact`, `integer`, `max`, `min`, `oneOf`, and `required`.

<details><summary>config</summary>

| option    | type     | description                                                                                |
| :-------- | :------- | :----------------------------------------------------------------------------------------- |
| `round`   | string   | Optional. Rounding method to use, one of `nearest`, `ceil`, `floor`                        |
| `default` | number   | Optional. Value used if the parser returns `undefined`, `null` or an invalid number `NaN`. |
| `parser`  | function | Optional. Used to customize how a value is converted into a number.                        |

</details>

#### object(schema)

The only validation type that does not cast the entered value, meaning it does not use a parser. There's also no default fallback value option here. Instead, the schema is an object where its properties are validation types such as `string`, `array`, `number`, etc. Nested `object` validators are allowed, but not recommended due to their complexity and potential performance hit.

For invalid results, errors are in the `errors` property. It matches the provided object with the same keys and strings or string records as values that contain the error messages.

Unlike yup, this API does not (yet at least) have a ref option.

To use this with a library such as [Formik][formik], you can use the resulting `errors` property. It is a key-value structure with the schema property keys and their validation errors if any. Besides that, the object validation results are the same as described above.

#### string(config?, ...tests)

Casts value to a string, `null` or `undefined` if using the default string parser. `config` is optional.

Supported validation tests: `email`, `exact`, `matches`, `max`, `min`, `oneOf`, `required`, and `url`.

<details><summary>config</summary>

| option    | type     | description                                                                              |
| :-------- | :------- | :--------------------------------------------------------------------------------------- |
| `trim`    | boolean  | Optional. If true, clears whitespace from the start and end of the string.               |
| `default` | string   | Optional. Value used if the parser returns `undefined`, `null`, or an empty string `''`. |
| `parser`  | function | Optional. Used to customize how a value is converted into a string.                      |

</details>

### Validation tests

A **validation test** is a simplified version of a validation type. It accepts a value of a specific type including `null` and `undefined` and then returns a promise that resolves to a validation result. You can use a validation test directly without the validation type, but it's not recommended as you lose the parsing step and you can't apply multiple tests to the same field as easily.

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

Ensures value matches the specified pattern. Works with strings. `pattern` is provided to the message.

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

#### required(message, nullable?)

Ensures value is **not** one of: `undefined`, `null`, `NaN`, an empty string, or an invalid date. Works with all types.

<details><summary>arguments</summary>

| name       | type               | description                       |
| :--------- | :----------------- | :-------------------------------- |
| `message`  | string or function | The validation error message.     |
| `nullable` | boolean            | Optional. If true, allows `null`. |

</details>

#### url(message, protocols?)

Ensures value is a valid URL. Works with strings. `protocols` is provided to the message.

<details><summary>arguments</summary>

| name        | type               | description                                              |
| :---------- | :----------------- | :------------------------------------------------------- |
| `message`   | string or function | The validation error message.                            |
| `protocols` | array              | List of allowed URL protocols, e.g. `https:`, `mailto:`. |

</details>

### Custom validation

Custom validation types and validators can be created and used as needed. There are some helpers that, while used internally, are considered part of the public API.

- [formatMessage(template, params)](#formatmessagetemplate-params)
- [createTypeValidatorTest(defaultConfig, applyConfig)](#createtypevalidatortestdefaultconfig-applyconfig)
- [valid(value, field)](#validvalue-field)
- [invalid(message, value, field, extras)](#invalidmessage-value-field-extras)

#### formatMessage(template, params)

Formats a string for use as an error message. `template` can be a plain string with `{keys}` replaced by the `params` or a function that returns a string and accepts `params` as a parameter.

#### createTypeValidatorTest(defaultConfig, applyConfig)

Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object that the `applyConfig` function will use when parsing the value being validated. At least this should include a `parser` function.

#### valid({ value, field })

Formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property.

#### invalid({ message, value, field, errors, extras })

Formats a failed validation result. `message` is the same as the `formatMessage`'s template. `value` and `field` is the same as above, `errors` is additional error details used by `array` and `object` validators, and `extras` are optional extra parameters that can be used in the message.

## Supported environments

- Node.js 12+, but may work in older Node.js versions.
- [ES2019 compatible browsers][compat], which essentially is all modern evergreen browsers and Safari 13.1+. If you need to target IE11, for example, ensure you use a compiler such as Babel.js.

Older environments may require polyfill or transpile for the following:

- `Promise`
- `async`, `await`
- `Array.prototype.find`
- `URL`
- Rest (`...`) parameters
- Object spread (`...`) operators
- Optional catch binding
- And possibly others

[npm]: https://www.npmjs.com/package/validator-fns
[docs]: #documentation
[github]: https://github.com/smonn/validator-fns
[yup]: https://github.com/jquense/yup
[compat]: https://kangax.github.io/compat-table/es2016plus/
[date-fns]: https://date-fns.org
[formik]: https://formik.org
[iso8601]: https://en.wikipedia.org/wiki/ISO_8601
