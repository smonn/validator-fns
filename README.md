# validator-fns

> Note that this package is still in alpha stages and the API might change before the final 1.0.0 release.

Minimal async validation library that aims to be as small as possible and with no
external dependencies. As a result, it does not include localized error messages.
API inspired by [yup][yup]. Built using TypeScript and includes definition files.
Built targeting ES6 (a.k.a. ES2015).

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
  .then(({ isValid, value, results }) => {
    if (isValid) {
      // use valid value
    } else {
      // check errors inside results
    }
  })
  .catch((err) => {
    // only throws if there's an uncaught error
    // and it failed to validate
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

## Supported environments

- Node.js 12+, but may work in older Node.js versions.
- [ES6 compatible browsers][compat].

Older environments may require polyfill or transpile for the following:

- `Promise`, `Promise.all`
- `Array.prototype.find`
- `URL`
- Rest (`...`) parameters and operators
- And possibly others

## License

MIT

[npm]: https://www.npmjs.com/package/validator-fns
[docs]: https://validator-fns.vercel.app/
[github]: https://github.com/smonn/validator-fns
[yup]: https://github.com/jquense/yup
[compat]: https://kangax.github.io/compat-table/es6/
