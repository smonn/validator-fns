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
  - [Errors tree](#errors-tree)
  - [Safe call and parse()](#safe-call-and-parse)
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
  messageTree,
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
    code: 'hello',
    message: 'Must be "hello".',
    value,
    field,
  });
});

const validate = object({
  firstName: string(
    { trim: true, messages: { required: 'First name is required.' } },
    min(1, 'First name is required.'),
  ),
  emailAddress: string(
    { messages: { required: 'Email address is required.' } },
    email('Must be a valid email address.'),
  ),
  age: number(
    { messages: { required: 'Age is required.' } },
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
      { messages: { required: 'Car brand is required.' } },
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
  optIn: boolean({ messages: { required: 'Must decide to opt in or out.' } }),
  notRobot: number(
    { messages: { required: 'Must enter the correct answer.' } },
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
  // handle and display errors, such as { firstName: 'First name is required.' }
  console.error(messageTree(result));
}
```

</details>

## Migrating from 2.x

Version 3 makes every type validator required by default. In 2.x, a validator without `required()` accepted `undefined`, `null` and the other missing values; in 3.x, it rejects `undefined` and `null`, the only missing values, with the `required` code.

1. **Move each `required(message)` into the config as `messages: { required }`**, merging it into a config object that's already there. The 3.0 prereleases called it `requiredMessage`:

   ```js
   // 2.x
   string(required('Enter a name.'), min(2, 'Too short.'));
   string({ trim: true }, required('Enter your city.'));
   array(string(), required('Pick some.'));

   // 3.x
   string({ messages: { required: 'Enter a name.' } }, min(2, 'Too short.'));
   string({ trim: true, messages: { required: 'Enter your city.' } });
   array(string(), { messages: { required: 'Pick some.' } });
   ```

2. **Wrap each validator that had no `required()` in `optional()`**, or it now rejects a missing value:

   ```js
   // 2.x
   string(email('Must be an email.'));

   // 3.x
   optional(string(email('Must be an email.')));
   ```

3. **Replace `required(message, true)`** (nullable): `optional()` accepts `null`, as well as `undefined`.
4. **Move `array()`'s config after the item validator**: `array(config, item, ...tests)` becomes `array(item, config, ...tests)`, as in `object(schema, config, ...tests)`. `array(config)` without an item validator stays. Passing the config first with an item validator throws a `TypeError`:

   ```js
   // 2.x
   array({ default: [] }, string(), min(2, 'Pick two.'));

   // 3.x
   array(string(), { default: [] }, min(2, 'Pick two.'));
   ```

5. **Check `object()` calls with a second argument**: it's a config object or the first object-level test, as in `object(schema, { messages }, ...tests)`. A missing object now fails with `required` instead of reporting each field as missing; wrap it in `optional()` to accept one.
6. **Replace `standard()`**: remove it around built-in validators, which are Standard Schemas themselves, and change `standard(fn)` to `createValidator(fn)`:

   ```js
   // 2.x
   standard(object({ email: string() }));
   standard(async (value, field) => valid({ value, field }));

   // 3.x
   object({ email: string() });
   createValidator(async (value, field) => valid({ value, field }));
   ```

7. **In TypeScript**, a valid result's `value` no longer includes `null` or `undefined` unless the validator is wrapped in `optional()`, and `object()` makes only `optional()` keys optional. `valid()` takes a value of the validator's type, so a custom validator that returns `null` or `undefined` needs them in its type, such as `Validator<string | undefined>`. `object()` takes one type parameter, the schema, so explicit type arguments such as `object<Schema, Value, Errors>(…)` become `object<Schema>(…)`, or can be left out. `check()`'s `path` must name properties of the parsed object, and an empty path `[]` is a type error; leave the path out instead. Tests are typed `Test<T, E>` and take the validator's value type, so a custom test that takes another type, or a test called directly with `null`, is a type error. A message function passed to `invalid()` gets `value` as `unknown`, and one that reads extra parameters needs them in `params`.
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
   // { state: 'invalid', code: 'min', params: { min: 5, amount: 3 }, message: 'Too small.', ... }
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
      check((value) => value > 0, 'positive', 'Must be positive.'),
    );
    ```

12. **Expect a rejection when your code throws.** In 2.x, `string()`, `number()`, `boolean()`, `date()` and `createTypeValidatorTest()` validators turned a throw from a test, a message function or a `parser` into an invalid result with the error's message, while `array()` and `object()` rejected. In 3.x, every validator rejects with the thrown value. Input a validator can't read still gives an invalid result.
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
          : invalid({ code: 'type', message: 'Must be text.', field }),
    });
    ```

14. **Read the code, not the wording.** Every failure has a `code`, such as `min` or `required`, and `params`, such as `{ min, amount }`, beside its `message`. See [Error codes](#error-codes). No English default remains: a message is optional on every built-in test, and a failure without one reads its code, until a translation arrives in a later 3.0 prerelease. `'Required.'` is now `'required'`, and `'Failed to parse value to number.'` is `'type'`, with `{ expected: 'number' }`.
15. **Give each custom failure a code**: `createValidatorTest(code, test, message?, getParams?)`, `check(path?, test, code, message?)` and `invalid({ code, params?, message?, value?, field, errors? })`. `invalid()` takes `params` in place of `extras`. A 2.x `check(test, message)` still runs, but its message becomes the code:

    ```js
    // 2.x
    createValidatorTest((value) => value % 2 === 0, 'Must be even.');
    check(
      'confirm',
      (value) => value.confirm === value.password,
      'Must match.',
    );
    invalid({ message: 'Taken.', value, field });

    // 3.x
    createValidatorTest('even', (value) => value % 2 === 0, 'Must be even.');
    check(
      'confirm',
      (value) => value.confirm === value.password,
      'match',
      'Must match.',
    );
    invalid({ code: 'taken', message: 'Taken.', value, field });
    ```

16. **Read `min`, `max` or `exact` instead of `limit`** in the messages of `min()`, `max()`, `exact()`, `minDate()` and `maxDate()`. `email()` and `uuid()` no longer give their `pattern` to the message.
17. **Expect codes in Standard Schema issues.** An issue for a failure carries its `code` and `params`, and an `array()` or `object()` whose children failed reports only their issues. An error without a message no longer gets `'Invalid value.'`.
18. **Give every schema property a validator.** `object()` throws a `TypeError` naming the key when it's built with a property that isn't a function, instead of failing that field with `'No validator set'` on every call.
19. **Read an `array()` or `object()` failure's `errors` as an [errors tree](#errors-tree) of failures.** Each failed item or field keeps its whole failure, with its `code`, `params`, `message`, `field` and own `errors`, in place of its message, and a valid item is still `null`. A failed array test, such as `max()`, no longer carries the items' errors. Pass a result to `messageTree()` for the nested messages 2.x gave, such as for Formik. `ArrayItemValidatorResult` is gone: in TypeScript, an array's errors are `(Failure<E> | null)[]`, and an object's have a `Failure` per key.

    ```js
    // 2.x
    result.errors; // { tags: [null, 'Too short.'] }

    // 3.x
    messageTree(result); // { tags: [null, 'Too short.'] }
    ```

20. **Expect full field paths.** A nested field is the whole path from the caller's field, such as `user.a.b` or `user.tags[1].name`. 2.x gave a nested object's field its bare key, such as `b` or `name`, and an item's field left out the caller's, such as `tags[1]`. An item of a root array is `[1]`. Messages that use `{field}` get the full path too, so `'{field} is required.'` reads `user.a.b is required.`.

21. **Treat only `undefined` and `null` as missing.** `''`, `NaN` and an invalid `Date` are present values, so they reach the parser and the tests. `string()` accepts `''`, and `string({ trim: true })` accepts `'  '` as `''`; add `min(1)` to reject them. `number()`, `date()` and `boolean()` fail `''`, `NaN` and an invalid `Date` with `type`, inside `optional()` too. A custom `parser` no longer gets `undefined` or `null`:

    ```js
    // 2.x
    string({ messages: { required: 'Enter a name.' } });

    // 3.x
    string(
      { messages: { required: 'Enter a name.' } },
      min(1, 'Enter a name.'),
    );
    ```

22. **Pass each type validator its own type.** In 2.x, the built-in parsers converted input: `number('42')` was `42`, `string(42)` was `'42'`, `boolean('false')` was `true`, `array('abc')` was `['a', 'b', 'c']` and `array(new Set())` held the set's items. In 3.x, each accepts only its own type and fails anything else with `type`, until `coerce` arrives in a later 3.0 prerelease. Convert the input before validating it, or with a custom `parser`, in the meantime:

    | Validator   | Accepts                                                                          | Fails with `type`, for example       |
    | :---------- | :------------------------------------------------------------------------------- | :----------------------------------- |
    | `string()`  | strings                                                                          | `42`, `new String('a')`, a `Date`    |
    | `number()`  | finite numbers                                                                   | `'42'`, `NaN`, `Infinity`, `10n`     |
    | `boolean()` | booleans                                                                         | `'false'`, `0`, `''`                 |
    | `date()`    | valid `Date` instances                                                           | `0`, `'2026-10-17'`, `new Date('x')` |
    | `array()`   | arrays                                                                           | `new Set()`, `'abc'`                 |
    | `object()`  | objects other than arrays, functions and boxed primitives; class instances count | `[]`, `() => {}`, `new String('a')`  |

    A `minDate()` or `maxDate()` limit that isn't a valid date, such as `null`, `undefined`, `''`, `NaN`, a timestamp out of a date's range or an invalid `Date`, now throws ``TypeError('`limit` must be a valid date')`` when the test is built. An unreadable string throws the same error instead of `Failed to parse value to date.` `min` and `max` in their messages are now always a `Date`. `minDate()`, `maxDate()` and `oneOf()` compare dates by `getTime()`, so a date's own `valueOf` no longer changes the outcome.

## API Reference

### Validation result

All validation tests yield one of two results: `valid` and `invalid`. Both are objects. In TypeScript the result is `Result<T, E>`, either `Valid<T>` or `Failure<E>`, and a validator is `Validator<T, E>`, where `T` is the value type and `E` the `errors` type. Both default to `unknown`.

| property  | type   | description                                                              |
| :-------- | :----- | :----------------------------------------------------------------------- |
| `state`   | string | Either `valid` or `invalid`.                                             |
| `field`   | string | Either the field name or `undefined`.                                    |
| `value`   | `T`    | The parsed value. Only if `state` is `valid`; a failure has no `value`.  |
| `code`    | string | What failed, unless `state` is `valid`. See [Error codes](#error-codes). |
| `params`  | object | The code's parameters, unless `state` is `valid`.                        |
| `message` | string | The error message unless `state` is `valid`. Without one, the code.      |
| `errors`  | `E`    | Only if `state` is `invalid`. See [Errors tree](#errors-tree).           |

### Errors tree

An `array()` or `object()` whose children failed has the `items` or `properties` code, and its `errors` hold each failed child's failure as the child returned it:

- `array()`: one entry per item, and `null` for a valid item.
- `object()`: only the failed properties, in schema order.
- A child that failed through its own children is an `items` or `properties` failure with its own tree. Any other failure is a leaf, including a custom one whose `errors` holds its own data.

Every `field` is the full path from the field the validator was called with: `user.a.b`, `user.tags[1].name`, or `[1].name` for a root array called without one. Keys aren't escaped. Messages, including `{field}` templates, get the full path.

```js
const user = object({
  a: object({ b: string(min(2)) }),
  tags: array(object({ name: string(min(2)) })),
});

await user({ a: { b: 'x' }, tags: [{ name: 'ok' }, { name: 'x' }] }, 'user');
// {
//   state: 'invalid', code: 'properties', params: {}, message: 'properties', field: 'user',
//   errors: {
//     a: { state: 'invalid', code: 'properties', ..., field: 'user.a',
//          errors: { b: { state: 'invalid', code: 'min', params: { min: 2, amount: 1 }, message: 'min', field: 'user.a.b' } } },
//     tags: { state: 'invalid', code: 'items', ..., field: 'user.tags',
//             errors: [null, { state: 'invalid', code: 'properties', ..., field: 'user.tags[1]',
//                              errors: { name: { state: 'invalid', code: 'min', ..., field: 'user.tags[1].name' } } }] },
//   },
// }
```

`messageTree()`, Standard Schema and `FailureError` read the tree, including one a custom validator built, and throw a `TypeError` for a tree that's a bug: an entry that is neither a whole failure nor `null` for a valid item, more than 1000 levels of `items` and `properties` failures, which a cyclic tree also reaches, or more than 1,000,000 entries. A failure shared by several entries counts once for each, so a few failures that each hold the previous one twice reach the entry limit quickly. The limits are far beyond any schema and keep such a tree from overflowing the stack or running for minutes. Reusing a failure is allowed.

In TypeScript, an array's errors are `(Failure<E> | null)[]`, with the item validator's `E`, and an object's have an optional `Failure` per key.

#### messageTree(result)

Turns a result into nested messages, for form libraries such as [Formik][formik]: `undefined` for a valid result, the message of a failure without children, and for an `items` or `properties` failure, its tree with each failure replaced by its messages and `null` for a valid item.

```js
messageTree(
  await user({ a: { b: 'x' }, tags: [{ name: 'ok' }, { name: 'x' }] }),
);
// { a: { b: 'min' }, tags: [null, { name: 'min' }] }

// Formik reads undefined as no errors.
<Formik validate={async (values) => messageTree(await user(values))} />;
```

In TypeScript, its return type follows the validator's errors type, such as `string | { a?: string | { b?: string }; tags?: … } | undefined` for `user`.

### Safe call and parse()

A validator has two entry points:

- **The safe call**, `await validator(value, field?)`, resolves to a [result](#validation-result). It never rejects for invalid input, so read `state` to tell valid from a failure.
- **`parse()`** resolves to the parsed value and rejects with a `FailureError` for invalid input.

Both reject with a bug's thrown value as it is, so `instanceof FailureError` tells a failure from a bug. See [Unreadable input and throws](#unreadable-input-and-throws).

#### parse(validator, value, field?)

Takes any validator, built-in or a plain async function, and resolves to its parsed value. Invalid input rejects with a `FailureError` carrying the failure the safe call gives.

```js
const user = object({ name: string(min(2)) });

await parse(user, { name: 'Ada' }, 'user'); // { name: 'Ada' }

try {
  await parse(user, { name: 'x' }, 'user');
} catch (error) {
  if (error instanceof FailureError) {
    error.failure; // the whole failure: code 'properties', with its errors tree
    error.message; // 'user.name: min'
    messageTree(error.failure); // { name: 'min' }
  } else {
    throw error; // a bug
  }
}
```

In TypeScript, `parse()` resolves to the validator's value type `T`.

#### FailureError

An `Error` subclass, with `name` set to `'FailureError'`. Its `failure` is the whole failure, with its `code`, `params`, `message`, `field` and [errors tree](#errors-tree). Its `message` has one line for each leaf in the tree, as `field: message`, or the message alone for a leaf without a field. It joins the messages the failure already has, so it adds no wording of its own:

```text
user.a.b: min
user.tags[1].name: min
```

`new FailureError(failure)` makes one from a failure, and throws a `TypeError` for anything else. In TypeScript, `FailureError<E>` carries a `Failure<E>`.

### Validation error message

The `message` argument in the validation tests is optional. It's a static string, a template string, or a function returning a string. Without one, the message is the code, unless the validator's `messages` config words it.

| type            | example                                                                                |
| :-------------- | :------------------------------------------------------------------------------------- |
| static string   | `'Username is required.'`                                                              |
| template string | `'Password must be at least {min} characters.'`                                        |
| function        | `` ({ value, field, max }) => `${field} must be less than ${max} but was ${value}.` `` |

A message always gets the parsed `value`, although the failure has none. If available, `field` is also provided. It also gets the failure's `params`, such as `min` for `min()`.

In TypeScript, a message function's parameters are typed: `ValidatorMessage<T, X>` gets the value and field, `X & ValidatorMessageParameters<T>`, where `X` holds the test's params. Each test's exported parameters type, such as `MinValidatorMessageParameters`, still describes everything a message gets, so a message annotated with it fits.

### Error codes

Every failure has a `code`, the name of what failed, and `params`, an object with the code's parameters. A program can read them instead of the message.

| code                       | raised by                                                 | `params`                           |
| :------------------------- | :-------------------------------------------------------- | :--------------------------------- |
| `min`                      | `min()`                                                   | `{ min, amount }`                  |
| `max`                      | `max()`                                                   | `{ max, amount }`                  |
| `exact`                    | `exact()`                                                 | `{ exact, amount }`                |
| `minDate`                  | `minDate()`                                               | `{ min }`                          |
| `maxDate`                  | `maxDate()`                                               | `{ max }`                          |
| `oneOf`                    | `oneOf()`                                                 | `{ values }`                       |
| `matches`                  | `matches()`                                               | `{ pattern }`                      |
| `url`                      | `url()`                                                   | `{ protocols }`                    |
| `integer`, `email`, `uuid` | those tests                                               | `{}`                               |
| `required`                 | a missing value                                           | `{}`                               |
| `type`                     | input of another type, or that the parser can't read      | `{ expected }`, such as `'number'` |
| `items`                    | an `array()` whose items failed                           | `{}`                               |
| `properties`               | an `object()` whose fields failed, or `check()` at a path | `{}`                               |

A custom test or validator names its own code, any string. The message is the first that applies: the one passed to the test, the one for the code in the validator's `messages` config, or the code itself. `messages` words only the validator's own failures: `required`, `type`, `items` or `properties`, and its tests' codes. It leaves an array's items and an object's fields as they failed, so give their validators their own `messages`.

```js
await string(min(3))('ab');
// { state: 'invalid', code: 'min', params: { min: 3, amount: 2 }, message: 'min', ... }

const name = string(
  { messages: { required: 'Enter a name.', min: 'At least {min}.' } },
  min(3),
);
await name('ab'); // { ..., message: 'At least 3.' }
await name(undefined); // { ..., message: 'Enter a name.' }
```

In TypeScript, `Messages<C>` maps codes to messages, and `BuiltInCode` is the union of the codes above, so a `Messages<BuiltInCode>` needs a message for each.

### Required and optional values

Every validation type rejects a missing value: `undefined` or `null`. Every other value is present, including `''`, `0`, `false`, `NaN`, an invalid date and `[]`. A missing value skips the parser, and a `default` fills it before the check. The tests only run on present values. `string()` accepts `''`, so use `min(1)` to reject it.

A missing value fails with the `required` code. Its message is `'required'` unless the config's `messages` sets one, a [validation error message](#validation-error-message):

```js
await string()(null);
// { state: 'invalid', code: 'required', params: {}, message: 'required', ... }

await number({ messages: { required: '{field} is required.' } })(
  undefined,
  'age',
);
// { state: 'invalid', message: 'age is required.', ... }
```

#### optional(validator)

Returns a validator that accepts a missing value, `undefined` or `null`. The missing value skips the parser and the tests, and becomes the result's `value` as it is. Present values go through `validator` as usual, so `optional(number())('')` fails with `type`. The validator passed in is unchanged.

```js
const nickname = optional(string(min(2, 'Too short.')));

await nickname(undefined); // { state: 'valid', value: undefined, ... }
await nickname('a'); // { state: 'invalid', message: 'Too short.', ... }
```

For a custom validator, `optional()` accepts `undefined` and `null` without calling it, and passes every other value to it.

In TypeScript, a validator's value type is `T`, and `optional()` adds `null` and `undefined`. In `object()`, a key is optional when its validator's value type includes `undefined`, so `object({ name: string(), age: optional(number()) })` is typed `{ name: string; age?: number | null | undefined }`.

### Unreadable input and throws

Input of another type, or that a custom parser can't read, gives an invalid result. For example, `number()` fails `'42'` with the `type` code and `{ expected: 'number' }`. A validator never rejects for its input.

A throw from your own code is a bug, so the validator rejects with the thrown value as it is, without wrapping it. That covers a test, a message function, a `parser`, `createTypeValidatorTest()`'s `applyConfig`, and a validator passed to `array()` or `object()`. `parse()` and `~standard.validate` reject the same way. Bad configuration, such as `object('nope')` or `minDate('nonsense', message)`, throws a `TypeError` when the validator or test is built.

A custom `parser` takes the input and the field name, and returns a result: `valid()` with the parsed value, or `invalid()` for input it can't read. It never gets `undefined` or `null`, which skip the parser as missing. A parsed `undefined` or `null` counts as missing too.

```js
const upper = string({
  parser: async (value, field) =>
    typeof value === 'string'
      ? valid({ value: value.toUpperCase(), field })
      : invalid({ code: 'type', message: 'Must be text.', field }),
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

Accepts an array. Anything else, such as a `Set` or a string, fails with the `type` code. `itemTest` is the validation type or test to be applied on each value within the array value. `config` is optional and comes after `itemTest`, as `object()`'s does. All remaining `tests` are applied to the array as a whole. Without `itemTest`, `array(config?)` keeps the items as they are and takes no tests.

A valid result's `value` holds each item as `itemTest` returned it, so `array(string({ trim: true }))` trims each item.

Supported validation tests: `max` and `min`.

When items fail, the array's own failure has the `items` code, and its `errors` hold each item's failure, `null` for a valid item. See [Errors tree](#errors-tree). A failed array test gives its own code, without the items' failures.

<details><summary>config</summary>

| option     | type     | description                                                                                                              |
| :--------- | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `default`  | string   | Optional. Value used for `undefined`, `null`, or an empty array `[]`.                                                    |
| `messages` | object   | Optional. Messages for the validator's own failures, keyed by code, such as `required`. See [Error codes](#error-codes). |
| `parser`   | function | Optional. Used to customize how a value is converted into an array.                                                      |

</details>

#### boolean(config?, ...tests)

Accepts `true` or `false`. Anything else, such as `'false'`, `0` or `''`, fails with the `type` code. `config` is optional.

Supported validation tests: `oneOf`.

<details><summary>config</summary>

| option     | type     | description                                                                                                              |
| :--------- | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `default`  | boolean  | Optional. Value used for `undefined` or `null`.                                                                          |
| `messages` | object   | Optional. Messages for the validator's own failures, keyed by code, such as `required`. See [Error codes](#error-codes). |
| `parser`   | function | Optional. Used to customize how a value is converted into a boolean.                                                     |

</details>

#### date(config?, ...tests)

Accepts a valid `Date`, including one from another realm, such as an iframe. Anything else, such as a timestamp, an ISO 8601 string or an invalid `Date`, fails with the `type` code. `config` is optional.

Supported validation tests: `maxDate`, `minDate`, and `oneOf`.

<details><summary>config</summary>

| option     | type     | description                                                                                                              |
| :--------- | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `default`  | date     | Optional. Value used for `undefined` or `null`.                                                                          |
| `messages` | object   | Optional. Messages for the validator's own failures, keyed by code, such as `required`. See [Error codes](#error-codes). |
| `parser`   | function | Optional. Used to customize how a value is converted into a date.                                                        |

To read dates from other input, such as [ISO 8601][iso8601] strings or other formats, use a custom `parser`, for example with a third-party library such as [date-fns][date-fns].

</details>

#### number(config?, ...tests)

Accepts a finite number. Anything else, such as `'42'`, `''`, `NaN`, `Infinity`, a bigint or a `Number` object, fails with the `type` code. `config` is optional.

Supported validation tests: `exact`, `integer`, `max`, `min`, and `oneOf`.

<details><summary>config</summary>

| option     | type     | description                                                                                                              |
| :--------- | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `default`  | number   | Optional. Value used for `undefined` or `null`.                                                                          |
| `messages` | object   | Optional. Messages for the validator's own failures, keyed by code, such as `required`. See [Error codes](#error-codes). |
| `parser`   | function | Optional. Used to customize how a value is converted into a number.                                                      |

</details>

#### object(schema, config?, ...tests)

Accepts an object other than an array, a function or a boxed primitive, such as `new String('a')`. Class instances, such as a `Map`, count, but only own properties are read, so a getter on a class's prototype reads as missing. Anything else fails with the `type` code. It has no parser and no default fallback value option. `config` is optional; when the second argument is a function, it's the first of the `tests`. A missing object, `undefined` or `null`, fails with `required` without checking its fields. Instead, the schema is an object where its properties are validation types such as `string`, `array`, `number`, etc. Nested `object` validators are allowed, but not recommended due to their complexity and potential performance hit. A schema property that isn't a validator throws a `TypeError` naming its key when the validator is built.

When fields fail, the object's own failure has the `properties` code, and its `errors` hold each failed field's failure under its key. See [Errors tree](#errors-tree).

In TypeScript, a field of the valid value is required unless its validator is wrapped in `optional()`, as in `{ name: string; age?: number | null | undefined }`. A missing optional field is still set on the value, as `undefined`.

The remaining `tests` are object-level tests. They run in order on the parsed object, only once every property is valid, and the first failure becomes the result. Use [`check`](#checkpath-test-code-message) to compare fields and put the error on one of them:

```ts
const signup = object(
  {
    password: string(),
    confirm: string(),
  },
  check(
    'confirm',
    (value) => value.confirm === value.password,
    'match',
    'Must match.',
  ),
);

await signup({ password: 'secret', confirm: 'other' });
// { state: 'invalid', code: 'properties', message: 'properties',
//   errors: { confirm: { state: 'invalid', code: 'match', message: 'Must match.', field: 'confirm', ... } }, ... }
```

A field's own error takes precedence: object-level tests don't run while any property is invalid, so they always compare valid, parsed values.

<details><summary>config</summary>

| option     | type   | description                                                                                                              |
| :--------- | :----- | :----------------------------------------------------------------------------------------------------------------------- |
| `messages` | object | Optional. Messages for the validator's own failures, keyed by code, such as `required`. See [Error codes](#error-codes). |

</details>

To use this with a library such as [Formik][formik], pass the result to [`messageTree()`](#messagetreeresult), which gives the messages under the schema's keys.

#### string(config?, ...tests)

Accepts a string, `''` included. Anything else, such as `42`, a `Date` or a `String` object, fails with the `type` code. `config` is optional.

Supported validation tests: `email`, `exact`, `matches`, `max`, `min`, `oneOf`, `url`, and `uuid`.

<details><summary>config</summary>

| option     | type     | description                                                                                                              |
| :--------- | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `trim`     | boolean  | Optional. If true, clears whitespace from the start and end of the string.                                               |
| `default`  | string   | Optional. Value used for `undefined`, `null`, or an empty string `''`.                                                   |
| `messages` | object   | Optional. Messages for the validator's own failures, keyed by code, such as `required`. See [Error codes](#error-codes). |
| `parser`   | function | Optional. Used to customize how a value is converted into a string.                                                      |

</details>

### Validation tests

A **validation test** is a simplified version of a validation type. It accepts a value of a specific type and returns a promise that resolves to a validation result. Validation types only run tests on present values, so a built-in test fails `null` and `undefined` when it's called with them directly. An empty string is a string like any other: `min(1, …)` fails it and `max(1, …)` accepts it. You can use a validation test directly without the validation type, but it's not recommended as you lose the parsing step and you can't apply multiple tests to the same field as easily.

In TypeScript, a test's type is `Test<T, E>`, a function that takes a value of type `T`. A validation type takes tests on its value type: `string()` takes `min()`, which checks strings, numbers and arrays, but not a test on booleans. A custom test that takes `unknown` fits every validation type.

- [check(path?, test, code, message?)](#checkpath-test-code-message)
- [email(message?)](#emailmessage)
- [exact(limit, message?)](#exactlimit-message)
- [integer(message?)](#integermessage)
- [matches(pattern, message?)](#matchespattern-message)
- [max(limit, message?)](#maxlimit-message)
- [maxDate(limit, message?)](#maxdatelimit-message)
- [min(limit, message?)](#minlimit-message)
- [minDate(limit, message?)](#mindatelimit-message)
- [oneOf(values, message?)](#oneofvalues-message)
- [url(message?, protocols?)](#urlmessage-protocols)
- [uuid(message?)](#uuidmessage)

Each test fails with its own [code](#error-codes), and its `message` is optional.

#### check(path?, test, code, message?)

An object-level test for `object`. It fails with `code` when `test` returns `false` for the parsed object. With a `path`, a property name or a list of names into nested objects, such as `['shipping', 'zip']`, the failure sits at that path in the object's `errors` with the full field, such as `shipping.zip`, under a `properties` failure for the object and each name. Without a `path`, the failure is the object's own. The parsed object is provided to the message as `value`.

In TypeScript, `path` is checked against the parsed object's type, so a misspelled property is a type error, and the test's error type is the errors it produces, such as `{ shipping?: Failure<{ zip?: Failure<never> }> }`. A path ends at an array, a date or a function.

<details><summary>arguments</summary>

| name      | type               | description                                                       |
| :-------- | :----------------- | :---------------------------------------------------------------- |
| `path`    | string or string[] | Optional. The property, or the path into nested objects, to fail. |
| `test`    | function           | Gets the parsed object and returns `true` when it is valid.       |
| `code`    | string             | The code to fail with, such as `match`.                           |
| `message` | string or function | Optional. The validation error message.                           |

</details>

#### email(message?)

Ensures the value follows an email address format. Works with strings.

<details><summary>arguments</summary>

| name      | type               | description                             |
| :-------- | :----------------- | :-------------------------------------- |
| `message` | string or function | Optional. The validation error message. |

</details>

#### exact(limit, message?)

Ensures value is of an exact `amount`. Works with strings, arrays, and numbers. `exact`, the limit, and `amount` (the string length, array length, or numeric value) are its params.

<details><summary>arguments</summary>

| name      | type               | description                                                      |
| :-------- | :----------------- | :--------------------------------------------------------------- |
| `limit`   | number             | The exact string length, array length, or numeric value allowed. |
| `message` | string or function | Optional. The validation error message.                          |

</details>

#### integer(message?)

Ensures value is an integer number. Works with numbers.

<details><summary>arguments</summary>

| name      | type               | description                             |
| :-------- | :----------------- | :-------------------------------------- |
| `message` | string or function | Optional. The validation error message. |

</details>

#### matches(pattern, message?)

Ensures value matches the specified pattern. Works with strings. `pattern` is its param. The `g` and `y` flags carry no state between values: each test starts at index 0, and `pattern.lastIndex` is left unchanged.

<details><summary>arguments</summary>

| name      | type               | description                              |
| :-------- | :----------------- | :--------------------------------------- |
| `pattern` | regular expression | The regular expression to match against. |
| `message` | string or function | Optional. The validation error message.  |

</details>

#### max(limit, message?)

Ensures value is of at most `limit`. Works with strings, arrays, and numbers. `max`, the limit, and `amount` (string length, array length, or numeric value) are its params. For a strict bound, use [`check()`](#checkpath-test-code-message), such as `check((value) => value < 10, 'under', 'Must be under 10.')`.

<details><summary>arguments</summary>

| name      | type               | description                                                        |
| :-------- | :----------------- | :----------------------------------------------------------------- |
| `limit`   | number             | The maximum string length, array length, or numeric value allowed. |
| `message` | string or function | Optional. The validation error message.                            |

</details>

#### maxDate(limit, message?)

Ensures value is on or before the specified date. Works with dates. `max`, the limit, is its param.

<details><summary>arguments</summary>

| name      | type                    | description                                                                                                |
| :-------- | :---------------------- | :--------------------------------------------------------------------------------------------------------- |
| `limit`   | date, number, or string | The maximum date allowed: a valid date, a timestamp, or a subset of [ISO 8601][iso8601] (no week formats). |
| `message` | string or function      | Optional. The validation error message.                                                                    |

</details>

#### min(limit, message?)

Ensures value is of at least `limit`. Works with strings, arrays, and numbers. `min`, the limit, and `amount` (string length, array length, or numeric value) are its params. For a strict bound, use [`check()`](#checkpath-test-code-message), such as `check((value) => value > 0, 'positive', 'Must be positive.')`.

<details><summary>arguments</summary>

| name      | type               | description                                                        |
| :-------- | :----------------- | :----------------------------------------------------------------- |
| `limit`   | number             | The minimum string length, array length, or numeric value allowed. |
| `message` | string or function | Optional. The validation error message.                            |

</details>

#### minDate(limit, message?)

Ensures value is on or after the specified date. Works with dates. `min`, the limit, is its param.

<details><summary>arguments</summary>

| name      | type                    | description                                                                                                |
| :-------- | :---------------------- | :--------------------------------------------------------------------------------------------------------- |
| `limit`   | date, number, or string | The minimum date allowed: a valid date, a timestamp, or a subset of [ISO 8601][iso8601] (no week formats). |
| `message` | string or function      | Optional. The validation error message.                                                                    |

</details>

#### oneOf(values, message?)

Ensures value is one of the specified values. Works with strings, arrays, booleans, and dates. `values` is its param.

<details><summary>arguments</summary>

| name      | type               | description                                                          |
| :-------- | :----------------- | :------------------------------------------------------------------- |
| `values`  | array              | List of allowed values. May be strings, numbers, booleans, or dates. |
| `message` | string or function | Optional. The validation error message.                              |

</details>

#### url(message?, protocols?)

Ensures value is a valid URL with an allowed protocol. Works with strings. `protocols` defaults to `['http:', 'https:']`, so `javascript:` and `data:` URLs, which can run script when used as a link, are invalid. A list replaces the default, so `['mailto:']` allows only `mailto:`. `protocols` is its param.

<details><summary>arguments</summary>

| name        | type               | description                                                                        |
| :---------- | :----------------- | :--------------------------------------------------------------------------------- |
| `message`   | string or function | Optional. The validation error message.                                            |
| `protocols` | array              | Allowed URL protocols, e.g. `https:`, `mailto:`. Defaults to `http:` and `https:`. |

</details>

#### uuid(message?)

Ensures the value is a UUID as defined by [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562): any version from 1 to 8 with the RFC's variant, or the nil or max UUID. Case-insensitive. Braces, a `urn:uuid:` prefix, and missing hyphens are invalid. Works with strings.

<details><summary>arguments</summary>

| name      | type               | description                             |
| :-------- | :----------------- | :-------------------------------------- |
| `message` | string or function | Optional. The validation error message. |

</details>

### Custom validation

Custom validation types and validators can be created and used as needed, with these helpers.

- [createValidator(fn)](#createvalidatorfn)
- [createTypeValidatorTest(defaultConfig, applyConfig)](#createtypevalidatortestdefaultconfig-applyconfig)
- [createValidatorTest(code, test, message?, getParams?)](#createvalidatortestcode-test-message-getparams)
- [valid({ value, field })](#valid-value-field-)
- [invalid({ code, params, message, value, field, errors })](#invalid-code-params-message-value-field-errors-)

#### createValidator(fn)

Makes a custom validator from `fn`, an async function that takes a value and a field name and returns a result made with `valid()` or `invalid()`. The validator gives the same results as `fn`, works with `optional()` and inside `object()` and `array()`, and is a [Standard Schema][standard-schema] like the validation types. `fn` itself is unchanged. A validator that's already a Standard Schema from this library, such as `string()`, is returned as it is. In TypeScript, its type is `TypeValidator<T, E>`, with `T` and `E` inferred from `fn`'s return type.

`fn` must return a promise. A synchronous function is a type error.

```ts
const hello = createValidator(async (value, field) =>
  value === 'hello'
    ? valid({ value, field })
    : invalid({ code: 'hello', message: 'Must be "hello".', value, field }),
);

await hello['~standard'].validate('hi');
// { issues: [{ message: 'Must be "hello".', code: 'hello', params: {} }] }

const schema = object({ email: string(email('Must be an email.')) });
await schema['~standard'].validate({ email: 'nope' });
// { issues: [{ message: 'Must be an email.', code: 'email', params: {}, path: ['email'] }] }
```

How a validator's results map to Standard Schema results:

- `validate` always returns a promise, because every validator here is async. Libraries that only accept synchronous schemas can't use it.
- A valid result gives `{ value }`, the parsed value. Its type is the validator's value type, which includes `null` and `undefined` only for `optional()` validators.
- An invalid result gives one issue per leaf of its [errors tree](#errors-tree), with the leaf's `message`, `code` and `params`. The object keys and array indexes down to the leaf form its `path`, and a failure without children has no path. An `items` or `properties` failure reports only its children, or itself when its tree holds no failure.

#### createTypeValidatorTest(defaultConfig, applyConfig)

Useful helper for simple validation types such as strings, numbers, etc. `defaultConfig` is the configuration object the validator starts from. It must include a `parser` function, which returns a result as described in [Unreadable input and throws](#unreadable-input-and-throws), and the config type declares `parser` and any options, such as `messages`. The validator parses the input with the config's `parser`, then `applyConfig` gets the parsed value and the config, and returns the value to check. The resulting validator is required by default, takes `messages` in its config, works with `optional()`, and is a Standard Schema, like the built-in ones. Its return type is a `TypeValidator`.

The validation tests passed to the resulting validator report their errors as strings, as the built-in ones do; a test whose `errors` has another type is a type error.

In TypeScript, the value type and the config type are inferred from `applyConfig`, so the validator accepts options that `defaultConfig` doesn't set. Passing them as type arguments, as in `createTypeValidatorTest<number, MoneyConfig>(…)`, still works.

```ts
import {
  createTypeValidatorTest,
  invalid,
  type Messages,
  type Result,
  valid,
} from 'validator-fns';

interface MoneyConfig {
  parser: (
    value: unknown,
    field?: string,
  ) => Promise<Result<number | null | undefined>>;
  messages?: Messages;
  /** Convert the amount to cents. */
  cents?: boolean;
}

/** Reads a number or a numeric string, and fails anything else. */
async function parseAmount(
  value: unknown,
  field?: string,
): Promise<Result<number | null | undefined>> {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (typeof amount === 'number') {
    return valid({ value: amount, field });
  }

  return invalid({ code: 'type', message: 'Must be an amount.', field });
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
// { state: 'invalid', code: 'type', message: 'Must be an amount.', ... }
```

#### createValidatorTest(code, test, message?, getParams?)

Makes a validation test from `test`, which gets the parsed value and the field and returns `true` when the value is valid. A failure has `code`, the params `getParams` returns for the value, or `{}`, and `message`, or else the code. A message only reads params when `getParams` is given; in TypeScript, reading them without it is a type error.

```ts
const even = createValidatorTest('even', (value: number) => value % 2 === 0);
const between = createValidatorTest(
  'between',
  (value: number) => value >= 1 && value <= 9,
  '{value} is not between {low} and {high}.',
  () => ({ low: 1, high: 9 }),
);

await number(even, between)(12);
// { state: 'invalid', code: 'between', params: { low: 1, high: 9 }, message: '12 is not between 1 and 9.', ... }
```

#### valid({ value, field })

Formats a successful validation result. `value` is the parsed value and `field` is the name of the object schema property. In TypeScript, `value` has the validator's value type, so a custom validator that can return `null` or `undefined` needs them in that type.

#### invalid({ code, params, message, value, field, errors })

Formats a failed validation result. `code` names what failed, and `params`, `{}` if left out, are its parameters. `message` is an optional [validation error message](#validation-error-message), with `{keys}` replaced by `value`, `field` and `params`; without it, the message is the code. `value` is optional and only goes to the message; the result has no `value`. `field` is the same as above, and `errors` is additional error details. Only an `items` or `properties` failure's `errors` is read as an [errors tree](#errors-tree); for any other code, it's the failure's own data.

In TypeScript, a message function gets `value` as `unknown`, since `invalid()` takes any value. A message that reads params needs `params` with them; without `params`, it's a type error.

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
