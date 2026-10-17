# validator-fns

The language of validator-fns, a small async validation library, and of its v3 contract. Decisions behind these terms live in the [v3 deep modules map](https://github.com/smonn/validator-fns/issues/686) and in `docs/adr/`.

## Validators and tests

**Validator**:
A function that takes unknown input and a field, and resolves to a result.
_Avoid_: schema (except for Standard Schema), ValidatorTest

**Type validator**:
A validator that parses input into one type, then runs its tests: `string`, `number`, `boolean`, `date`, `array`, `object`, or one made from a custom parser.
_Avoid_: type, factory

**Parser**:
The part of a type validator that turns unknown input into its type, or reports unreadable input. Any validator can serve as a parser.
_Avoid_: cast, coercer

**Test**:
A check on a value that has already been parsed, such as `min()` or `check()`.
_Avoid_: rule, validation test, ValidationTest

**Optional**:
A wrapper that lets a validator accept missing input instead of failing with `required`.
_Avoid_: nullable

**Missing**:
Input that counts as absent for a type validator. It fails with `required` unless the validator is optional or has a default.
_Avoid_: blank, empty, nullish

**Default**:
The value a type validator uses in place of missing input.
_Avoid_: fallback

## Collections

**Collection**:
A type validator whose value holds children: `array` or `object`.
_Avoid_: container

**Child**:
An item of an array or a property of an object, and the validator that validates it.
_Avoid_: element, member

**Property**:
A key of an object's schema, together with its child validator.
_Avoid_: field (which names a value, not a key), attribute

**Gate**:
The checks a collection makes on itself before any child runs: an array's length bounds and an object's strict keys.
_Avoid_: guard, precheck

**Collection test**:
A test on a whole collection that runs only once every child is valid.
_Avoid_: object-level test, array-level test

**Field**:
The name or path of the value under validation, such as `email` or `tags[0]`.
_Avoid_: key, name

## Results

**Result**:
What a validator resolves to: valid, with the parsed value, or a failure.
_Avoid_: response, outcome

**Failure**:
The result for invalid input. It carries a code, params and a message, but no value.
_Avoid_: invalid result, error, validation error

**Unreadable input**:
Input a parser can't turn into its type. It's a failure with code `type`, never a throw.
_Avoid_: parse error, cast failure

**Errors tree**:
The failures of a collection's children, nested by property and index.
_Avoid_: errors object, details

**Issue**:
A failure as Standard Schema reports it, with a path. Use it only when talking about `~standard`.
_Avoid_: problem

**Bug**:
A throw from user code, such as a test, a message function or a custom validator. It propagates unchanged and is never a failure.
_Avoid_: validation error, exception

**Bad configuration**:
Invalid options given to a validator factory. It throws when the validator is built, not when it runs.
_Avoid_: invalid config error

## Messages

**Code**:
The name of what failed: the test's name, such as `min` or `oneOf`, or `required`, `type`, `unknownKeys`, `items` or `properties`. Custom failures name their own.
_Avoid_: error code, error type, kind

**Params**:
The facts a failure carries for its message, such as `min` and `amount` for `min()`.
_Avoid_: extras, message parameters, details

**Message**:
The human-readable text of a failure. With none supplied, it's the code.
_Avoid_: error, label

**Translation**:
A map from codes to messages, applied to a whole validator tree, such as the English one at `validator-fns/en`.
_Avoid_: locale (except for the subpath name), i18n, error map
