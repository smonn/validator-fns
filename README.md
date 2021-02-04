# validator-fns

![current version](https://img.shields.io/npm/v/validator-fns?color=%23369&label=current%20version) ![minified size](https://img.shields.io/bundlephobia/min/validator-fns?color=%23369) ![minified plus gzip size](https://img.shields.io/bundlephobia/minzip/validator-fns?color=%23369&label=minified%20plus%20gzip%20size) ![supported node version](https://img.shields.io/node/v/validator-fns?color=%23369&label=supported%20node%20version) ![included types](https://img.shields.io/npm/types/validator-fns?color=%23369&label=included%20types) ![license](https://img.shields.io/npm/l/validator-fns?color=%23369) ![dev dependencies](https://img.shields.io/librariesio/release/npm/validator-fns?color=%23369&label=dev%20dependencies) ![code coverage](https://img.shields.io/coveralls/github/smonn/validator-fns?color=%23369&label=code%20coverage) ![total downloads](https://img.shields.io/npm/dt/validator-fns?color=%23369&label=total%20downloads)

Small asynchronous validation library. Tries to be as small as possible and use no external dependencies. Note that this library does not include localized error messages. API inspired by [yup][yup]. Built using TypeScript and includes definition files. This library targets modern browsers only--configure your build accordingly.

[npm][npm] | [github][github]

<!-- toc -->

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [Shared](#shared)
    - [`required(message[, nullable])`](#requiredmessage-nullable)
    - [`min(amount, message, exclusive)`](#minamount-message-exclusive)
    - [`max(amount, message, exclusive)`](#maxamount-message-exclusive)
    - [`exact(amount, message)`](#exactamount-message)
    - [`oneOf(values, message)`](#oneofvalues-message)
  - [Strings](#strings)
    - [`string([config,] ...tests)`](#stringconfig-tests)
    - [`matches(pattern, message)`](#matchespattern-message)
    - [`email(message)`](#emailmessage)
    - [`url(message[, protocols])`](#urlmessage-protocols)
  - [Numbers](#numbers)
    - [`number([config,] ...tests)`](#numberconfig-tests)
    - [`integer(message)`](#integermessage)
  - [Booleans](#booleans)
    - [`boolean([config,] ...tests)`](#booleanconfig-tests)
  - [Dates](#dates)
    - [`date([config,] ...tests)`](#dateconfig-tests)
    - [`minDate(date, message)`](#mindatedate-message)
    - [`maxDate(date, message)`](#maxdatedate-message)
  - [Arrays](#arrays)
    - [`array([config,] ...tests)`](#arrayconfig-tests)
  - [Objects](#objects)
    - [`object(schema)`](#objectschema)
- [Custom validation](#custom-validation)
  - [`formatMessage(template, params)`](#formatmessagetemplate-params)
  - [`createTypeValidatorTest(defaultConfig, applyConfig)`](#createtypevalidatortestdefaultconfig-applyconfig)
  - [`valid(value, field)`](#validvalue-field)
  - [`invalid(message, value, field, extras)`](#invalidmessage-value-field-extras)
  * [Requirements for custom validation](#requirements-for-custom-validation)
- [Supported environments](#supported-environments)

<!-- tocstop -->

## Install

```sh
npm install validator-fns
# or
yarn add validator-fns
```

## Usage

```typescript
// For CommonJS environments
// const {
//   array,
//   boolean,
//   date,
//   email,
//   exact,
//   integer,
//   matches,
//   max,
//   maxDate,
//   min,
//   minDate,
//   number,
//   object,
//   oneOf,
//   required,
//   string,
//   url,
//   ValidatorTest,
//   valid,
//   invalid,
// } = require('validator-fns');

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
  ValidatorTest,
  valid,
  invalid,
} from 'validator-fns';

const ONE_DAY = 1000 * 60 * 60 * 24;
const TEN_DAYS = ONE_DAY * 10;
const now = new Date();
const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);

const customValidator: ValidatorTest<string> = (value, field) => {
  if (value === 'hello') {
    return valid(value, field);
  }
  return invalid('Must be "hello".', value, field, null);
};

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
    min(18, 'Must be at least 18 years old.')
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

## API

All validation tests yield one of two results: `valid` and `invalid`. Both are objects.

The `valid` result includes the following properties:

- `state` set to `'valid'`
- `isValid` set to true (deprecated)
- `field` if provided at validation time or if using the object validation type
- `value` as the parsed value

The `invalid` result includes the same as above, with these differences:

- `state` set to `'invalid'`
- `isValid` set to false (deprecated)
- `message` containing the validation test's error message unless using `object` or `array`
- `errors` is `null` unless using `object` or `array` then it contains the error messages, see below for more details

### Shared

#### `required(message[, nullable])`

Ensures value is not one of:

- `undefined`
- `null`
- `NaN`
- an empty string
- an invalid date

If nullable is true, this will consider `null` values as acceptable.

#### `min(amount, message, exclusive)`

Ensures value is of at least `amount`. It can be a string length, array length, or numeric value. Exclusive makes the amount comparison exclusive instead of inclusive.

#### `max(amount, message, exclusive)`

Ensures value is of at most `amount`. It can be a string length, array length, or numeric value. Exclusive makes the amount comparison exclusive instead of inclusive.

#### `exact(amount, message)`

Ensures value is of an exact `amount`. It can be a string length, array length, or numeric value.

#### `oneOf(values, message)`

Ensures value is one of the specified values. It can be strings, numbers, booleans, or dates.

### Strings

#### `string([config,] ...tests)`

Casts value to a string, `null` or `undefined` if using the default string parser. `tests` can be all `string` specific and shared validation tests. `config` is an optional parameter with the following properties:

- `trim` removes whitespace from the parsed string.
- `default` sets the default value in case the parsed string is `undefined`.
- `parser` allows you to override the default string parser. Check the source code for the current implementation. Validation tests assume this returns a string, `null` or `undefined`.

#### `matches(pattern, message)`

Ensures value matches the specified pattern.

#### `email(message)`

Ensures the value follows an email address format.

#### `url(message[, protocols])`

Ensures value is a valid URL. The optional `protocols` parameter is an allow-list of valid URL protocols. For example: `https:`, `mailto:`, etc.

### Numbers

#### `number([config,] ...tests)`

Casts value to a number, `null` or `undefined` if using the default number parser. `tests` can be all number specific and shared validation tests. `config` is an optional parameter with the following properties:

- `round` forces the value to be rounded using a specific method. Valid values are `nearest`, `ceil` and `floor`.
- `default` sets the default value in case the parsed number is `undefined`.
- `parser` allows you to override the default number parser. Check the source code for the current implementation. Validation tests assume this returns a number, `null` or `undefined`.

#### `integer(message)`

Ensures value is an integer number.

### Booleans

#### `boolean([config,] ...tests)`

Casts value to a boolean, `null` or `undefined` if using the default boolean parser. The only supported validation test is `required`, but you may provide custom ones. `config` is an optional parameter with the following properties:

- `default` sets the default value in case the parsed boolean is `undefined`.
- `parser` allows you to override the default boolean parser. Check the source code for the current implementation. Validation tests assume this returns a boolean, `null` or `undefined`.

### Dates

#### `date([config,] ...tests)`

Casts value to a date, `null` or `undefined` if using the default date parser. `tests` can be all date specific and the required validation tests. `config` is an optional parameter with the following properties:

- `default` sets the default value in case the parsed date is `undefined`.
- `parser` allows you to override the default date parser. Check the source code for the current implementation. Validation tests assume this returns a date, `null` or `undefined`. The default parser only accepts dates, numbers, and a subset of [ISO 8601][iso8601] formatted strings (excludes week formats). If you want to allow other or more complex formats you should use a third-party library such as [date-fns][date-fns].

#### `minDate(date, message)`

Ensures value is on or after the specified date.

#### `maxDate(date, message)`

Ensures value is on or before the specified date.

### Arrays

#### `array([config,] ...tests)`

Casts value to an array, `null` or `undefined` if using the default date parser. `tests` are all shared validation tests. `config` is an optional parameter with the following properties:

- `default` sets the default value in case the parsed array is `undefined`.
- `parser` allows you to override the default array parser. Check the source code for the current implementation. Validation tests assume this returns an array, `null` or `undefined`.

For invalid results, errors are in the `errors` property. It contains an array of:

```ts
{
  error: null | { [key: string]: string };
  message: string;
  index: number;
}
```

### Objects

#### `object(schema)`

The only validation type that does not cast the entered value, meaning it does not use a parser. There's also no default fallback value option here. Instead, the schema is an object where its properties are validation types such as string, array, number, etc. Nested `object` validators are allowed, but not recommended due to their complexity.

For invalid results, errors are in the `errors` property. It matches the provided object with the same keys and strings or string records as values that contain the error messages.

Unlike yup, this API does not (yet at least) have a ref option.

To use this with a library such as [Formik][formik], you can use the resulting `errors` property. It is a key-value structure with the schema property keys and their validation errors if any. Besides that, the object validation results are the same as described above.

## Custom validation

Custom validation types and validators can be created and used as needed. There are some helpers that, while used internally, are considered part of the public API.

#### `formatMessage(template, params)`

Formats a string for use as an error message. `template` can be a plain string with `{keys}` replaced by the `params` or a function that returns a string and accepts `params` as a parameter.

#### `createTypeValidatorTest(defaultConfig, applyConfig)`

Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object that the `applyConfig` function will use when parsing the value being validated. At least this should include a `parser` function.

#### `valid(value, field)`

Formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property.

#### `invalid(message, value, field, extras)`

Formats a failed validation result. `message` is the same as the `formatMessage`'s template. `value` and `field` is the same as above, and `extras` are optional extra parameters that can be used in the message.

### Requirements for custom validation

A **validation type** is expected to parse and prepare the value for the provided validation tests. For example, the `string()` validation type ensures the provided value is a string, `null` or `undefined`. It must be a function that takes a value of any type and returns a promise which resolves to a validation result (see above).

A **validation test** is a simplified version of a validation type. It accepts a value of a specific type including `null` and `undefined` and then returns a promise that resolves to a validation result.

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
