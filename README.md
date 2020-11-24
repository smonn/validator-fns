# validator-fns

> Note that this package is still in alpha stages and the API might change before the final 1.0.0 release.

Minimal async validation library that aims to be below 5 kB minified and with no external dependencies. Does not include localized error messages.

[npm][npm] | [docs][docs] | [github][github]

## Install

```sh
npm install validator-fns
```

## Usage

```js
import {
  object,
  string,
  number,
  required,
  minLength,
  maxLength,
  min,
  integer,
} from 'validator-fns';

const validate = object({
  username: string(
    required('Username is required.'),
    minLength(5, 'Must be at least 5 characters'),
    maxLength(20, 'Must be at most 20 characters.')
  ),
  age: number(
    required('Age is required.'),
    integer('Must be an integer.'),
    min(18, 'Must be at least 18.')
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

## Current and planned features

- async only
- numbers
- booleans
- dates
- strings + email + url
- objects + nested objects
- arrays

## Supported environments

- Node.js 12+, but may work in older Node.js versions.
- ES6 compatible browsers.

Older environments may require polyfills for the following:

- `Promise`, `Promise.all`
- `Array.prototype.find`
- `URL`

## License

MIT

[npm]: https://www.npmjs.com/package/validator-fns
[docs]: https://validator-fns.vercel.app/
[github]: https://github.com/smonn/validator-fns
