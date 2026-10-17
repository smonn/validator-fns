---
status: accepted
---

# Tests are steps

## Context

In 2.x, a test's result value is never read, so only the parser can change the value. Transforms are options: `trim` on `string()` and `round` on `number()`. v3 drops `round` (#691). `trim` decides what counts as missing: it runs before the missing check, so `string({ trim: true })` fails `'  '` with `required`. Zod and Valibot run transforms and checks in the order written and have no missing concept, so a blank string passes unless a check rejects it. Yup runs every transform before any test.

## Decision

Decided in #700:

- **Tests are steps.** Each test's valid value goes to the next test, in the order written, and the last one is the result's value. A step keeps the value's type. A change of type goes through a parser.
- **`transform(fn)` makes a test that changes the value.** `fn` is synchronous, `(value: T) => T`, and never fails. A throw from it is a bug (ADR 0001). Core ships no named transforms.
- **`trim` is dropped.** Trimming is `transform((s) => s.trim())`.
- **No missing check after a step.** Amended in #692 (ADR 0004). Missing is only `undefined` or `null`, which a step can't return, so the missing check runs once, on the input.

## Considered options

- **Tests only check, with transforms through custom types.** No new concept, but lowercasing an email needs a custom type wrapping `string()`.
- **A changed value checked for missing again.** #700 first chose it, so that trimming `'  '` failed with `required`, as `''` did. #692 dropped it once `''` stopped counting as missing.
- **Transforms before the missing check, as in Yup.** It breaks the in-order rule, so `transform(Math.round)` after `integer()` would run before it.
- **`trim` as a parse option.** It keeps 2.x's behaviour without a re-check, but gives two ways to change a string, one of them string-only.

## Consequences

- A hand-written test that resolves to a valid result with a different value now transforms. The migration notes cover it, and `trim`.
- Do not add named transforms such as `trim()` or `toLowerCase()` to core. Each is a one-line `transform()`.
