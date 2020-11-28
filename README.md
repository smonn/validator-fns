# validator-fns

![npm](https://img.shields.io/npm/v/validator-fns) ![npm bundle size](https://img.shields.io/bundlephobia/min/validator-fns) ![node-current](https://img.shields.io/node/v/validator-fns) ![npm type definitions](https://img.shields.io/npm/types/validator-fns) ![NPM](https://img.shields.io/npm/l/validator-fns) ![npm](https://img.shields.io/npm/dw/validator-fns)

> Note that this package is still in beta stages and the API might change before the final 1.0.0 release.

Minimal async validation library that aims to be as small as possible and with no external dependencies. Current UMD build is less that 2 kB minified + gzip. Note that this library does not include localized error messages. API inspired by [yup][yup]. Built using TypeScript and includes definition files. Built targets ES2019.

[npm][npm] | [docs][docs] | [github][github]

## Install

```sh
npm install validator-fns
```

## Usage

```js
// For CommonJS environments
// const {
//   object,
//   string,
//   number,
//   required,
//   min,
//   max,
//   integer,
// } = require('validator-fns');

import {
  object,
  string,
  number,
  required,
  min,
  max,
  integer,
} from 'validator-fns';

const validate = object({
  username: string(
    { trim: true },
    required('Username is required.'),
    min(5, 'Must be at least {min} characters.'),
    max(20, 'Must be at most {max} characters.')
  ),
  age: number(
    required('Age is required.'),
    integer('Must be an integer.'),
    min(18, ({ min }) => `Must be at least ${min}.`)
  ),
});

// later...

validate({ username: 'hello', age: 15 })
  .then(({ isValid, value, errors }) => {
    if (isValid) {
      // use valid value
    } else {
      // check and display errors, e.g. errors.username might be 'Username is required.'
    }
  })
  .catch((err) => {
    // only throws if there's an uncaught error and it failed to validate
  });
```

## Current features

- async only
- shared: required, min, max
- numbers: integer
- booleans
- dates: minDate, maxDate
- strings: pattern, email, url
- objects and nested objects
- arrays

## Documentation

All validation tests yield one of two results: `valid` and `invalid`. Both are objects.

The `valid` result includes the following properties:

- `isValid` set to true
- `field` if provided at validation time or if using the object validation type
- `value` as the parsed value

The `invalid` result includes the same as above, with these differences:

- `isValid` set to false
- `message` containing the validation test's error message

### Shared

`required(message[, nullable])` - Ensures value is not undefined, null, an empty string, `NaN`, or an invalid date. If nullable is set to true, this will consider null values as acceptable.

`min(amount, message)` - Ensures value is of a minimum amount. Amount here refers to string length, array length, and number value.

`max(amount, message)` - Ensures value is of a maximum amount. Amount here refers to string length, array length, and number value.

### Strings

`string([config,] ...tests)` - Casts value to string, null, or undefined if using the default string parser. `tests` can be all string specific and shared validation tests. `config` is an optional parameter with the following properties:

- `trim` removes whitespace from the parsed string.
- `default` sets the default value in case the parsed string is undefined.
- `parser` allows you to override the default string parser. Check the source code for the current implementation, validation tests assume this returns a string, null, or undefined.

`matches(pattern, message)` - Ensures value matches the specified pattern.

`email(message)` - Ensures the value is formatted like an email address.

`url(message[, protocols])` - Ensures value is a valid URL. The optional protocols parameter is an allow-list of valid URL protocols, such as `https:`, `mailto:`, etc.

### Numbers

`number([config,] ...tests)` - Casts value to number, null, or undefined if using the default number parser. `tests` can be all number specific and shared validation tests. `config` is an optional parameter with the following properties:

- `round` can be used to force number to be rounded using a specific method. Valid values are `nearest`, `ceil`, and `floor`.
- `default` sets the default value in case the parsed number is undefined.
- `parser` allows you to override the default number parser. Check the source code for the current implementation, validation tests assume this returns a number, null, or undefined.

`integer(message)` - Ensures value is an integer number.

### Booleans

`boolean([config,] ...tests)` - Casts value to boolean, null, or undefined if using the default boolean parser. The only supported validation test is `required`, but you may provide custom ones. `config` is an optional parameter with the following properties:

- `default` sets the default value in case the parsed boolean is undefined.
- `parser` allows you to override the default boolean parser. Check the source code for the current implementation, validation tests assume this returns a boolean, null, or undefined.

### Dates

`date([config,] ...tests)` - Casts value to Date, null, or undefined if using the default date parser. `tests` can be all date specific and the required validation tests. `config` is an optional parameter with the following properties:

- `default` sets the default value in case the parsed date is undefined.
- `parser` allows you to override the default date parser. Check the source code for the current implementation, validation tests assume this returns a date, null, or undefined. The default parser only accepts `Date`s, numbers, and ISO 8601 formatted strings. If you want to allow other formats it's recommended to use a third-party library such as [date-fns][date-fns].

`minDate(date, message)` - Ensures value is on or after the specified date.

`maxDate(date, message)` - Ensures value is on or before the specified date.

### Arrays

`array([config,] ...tests)` - Casts value to array, null, or undefined if using the default date parser. `tests` are all shared validation tests. `config` is an optional parameter with the following properties:

- `default` sets the default value in case the parsed array is undefined.
- `parser` allows you to override the default array parser. Check the source code for the current implementation, validation tests assume this returns an array, null, or undefined.

### Objects

`object(schema)` - The only validation type that does not cast the entered value, meaning it does not use a parser. There's also no default fallback value option here. Instead, the schema is a plain object where its properties are validation types such as string, array, number, etc. Nested objects are also allowed, but not recommended due to their complexity.

Unlike yup, this API does not (yet at least) have a ref option.

To use this with a library such as [Formik][formik], you can use the resulting `errors` property which is a key-value structure with the schema property keys and their validation errors, if any. Besides that, the object validation results are the same as described above.

## Custom validation

Custom validation types and validators can be created and used as needed. There are some helpers that, while used internally, are considered part of the public API.

`formatMessage(template, params)` - Formats a string for use as an error message. `template` can be a plain string with `{keys}` replaced by the `params`, or a function that returns a string and accepts `params` as a parameter.

`createTypeValidatorTest(defaultConfig, applyConfig)` - Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object that the `applyConfig` function will use when parsing the value being validated. At minimum this should include a `parser` function.

`valid(value, field)` - Simple helper that formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property.

`invalid(message, value, field, extras)` - Formats a failed validation result. `message` is the same as the `formatMessage`'s template. `value` and `field` are the same as above, and `extras` are optional extra parameters that can be used in the message.

### Requirements for custom validation

A **validation type** is expected to parse and prepare the value for the provided validation tests. For example, the `string()` validation type ensures the provided value is a string, null, or undefined. Furthermore, it's expected to accept one or more validation tests but it's not required if you don't need to support that. Either way, it must be a function that accepts a value of any type and returns a promise which resolves to a validation result (see above). If configured with validation tests, the test's results should be considered for the final validation result.

A **validation test** is a simplified version of a validation type. It can simply accept a value of a specific type including null and undefined and then return a promise that resolves to a validation result.

## Supported environments

- Node.js 12+, but may work in older Node.js versions.
- [ES2019 compatible browsers][compat], which essentially is all modern evergreen browsers and Safari 13.1+. If you need to target IE11 for example, ensure you use a compiler such as Babel.js.

Older environments may require polyfill or transpile for the following:

- `Promise`, `Promise.all`
- `async`, `await`
- `Array.prototype.find`
- `URL`
- Rest (`...`) parameters
- Object spread (`...`) operators
- Optional catch binding
- And possibly others

## License

MIT

[npm]: https://www.npmjs.com/package/validator-fns
[docs]: #documentation
[github]: https://github.com/smonn/validator-fns
[yup]: https://github.com/jquense/yup
[compat]: https://kangax.github.io/compat-table/es2016plus/
[date-fns]: https://date-fns.org
[formik]: https://formik.org
