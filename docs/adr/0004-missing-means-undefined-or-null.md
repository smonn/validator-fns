---
status: accepted
---

# Missing means undefined or null

## Context

In 2.x, eight places define missing, and they disagree by type. After parsing, `''`, `NaN` and an invalid date are missing. `number()` and `date()` read blank text as missing, `boolean()` reads `''` as `false`, and `array()` lets `default` replace `[]` while `required` accepts it. #683 is one symptom. Built-in parsers coerce: `boolean('false')` is `true`, and `array('abc')` is `['a', 'b', 'c']`. Zod and Valibot have no missing concept. Only `undefined` is absent, and parsers accept their own type unless asked to coerce.

## Decision

Decided in #692:

- **Missing is `undefined` or `null`, for every type.** `''`, `0`, `false`, `NaN`, `[]` and `{}` are present. A parser that can't read a present value, such as `''` or `NaN` given to `number()`, fails it with `type`.
- **The missing check runs once, on the input.** A parser never sees missing input. A step keeps type T, so it can't make a value missing, and ADR 0003's re-check is dropped.
- **Built-in parsers accept only their own type.** Coercion, such as `'42'` to `42`, is a separate, explicit step. In #736, it became `coerce.number()`, `coerce.date()` and `coerce.boolean()`. Each one coerces the input before the missing check, so blank text becomes `undefined` and an empty form field is missing, then runs the strict built-in.
- **`default` fills missing input only.** The parser is skipped, and the tests and transforms run on the default. It's a plain value, with no function form, and it applies before `optional()`.
- **`object()` builds its default from its children.** For missing input, each child runs on `undefined`. If all of them are valid, that object is the value, and its collection tests run on it. Otherwise the object fails with `required`.

## Considered options

- **`''`, `NaN` and an invalid date are missing too, as in 2.x.** An empty form field fails with `required` for every type, but each type keeps its own idea of missing.
- **Blank strings are missing for every type.** `string()` would fail `'  '` without a transform, unlike 2.x, Zod and Yup.
- **Parsers read blank text as missing.** It keeps `required` for an empty number field, but brings back a reading of missing for each type.
- **Lenient built-in parsers**, as in 2.x, or reading only numeric and ISO strings. Handy for forms and query strings, but each built-in decides what text it accepts, and surprises such as `boolean('false')` stay in core.
- **The default returned as it is, as Zod's `.default()` does.** Simpler, but a default would skip transforms and tests.
- **An object always built from its children, failing with each child's failure.** It suits form error trees, but loses "the whole section is missing".

## Consequences

- An empty form field fails `number()` and `date()` with `type`, not `required`, unless a coerce twin such as `coerce.number()` turns `''` into `undefined` first. A translation words the failure.
- `string()` accepts `''`. `min(1)` rejects it.
- `array({ default })` no longer replaces `[]`.
- Do not make another value missing for one type. That is the per-type definition this replaces.
