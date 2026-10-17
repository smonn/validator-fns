---
status: accepted
---

# Tests are steps; a changed value is checked for missing again

## Context

In 2.x, a test's result value is never read, so only the parser can change the value. Transforms are options: `trim` on `string()` and `round` on `number()`. v3 drops `round` (#691). `trim` decides what counts as missing: it runs before the missing check, so `string({ trim: true })` fails `'  '` with `required`. Zod and Valibot run transforms and checks in the order written and have no missing concept, so a blank string passes unless a check rejects it. Yup runs every transform before any test.

## Decision

Decided in #700:

- **Tests are steps.** Each test's valid value goes to the next test, in the order written, and the last one is the result's value. A step keeps the value's type. A change of type goes through a parser.
- **`transform(fn)` makes a test that changes the value.** `fn` is synchronous, `(value: T) => T`, and never fails. A throw from it is a bug (ADR 0001). Core ships no named transforms.
- **`trim` is dropped.** Trimming is `transform((s) => s.trim())`.
- **A changed value is checked for missing again.** After a step returns a different value, the missing check runs on it. A missing value fails with `required`, or inside `optional()` it's valid and the later steps are skipped.

## Considered options

- **Tests only check, with transforms through custom types.** No new concept, but lowercasing an email needs a custom type wrapping `string()`.
- **No re-check, as in Zod and Valibot.** Simpler, but `string(transform((s) => s.trim()))` would accept `'  '` as `''`, and `''` would fail with `required` while `'  '` fails with a test's code, such as `min`.
- **Transforms before the missing check, as in Yup.** It breaks the in-order rule, so `transform(Math.round)` after `integer()` would run before it.
- **`trim` as a parse option.** It keeps 2.x's behaviour without a re-check, but gives two ways to change a string, one of them string-only.

## Consequences

- A hand-written test that resolves to a valid result with a different value now transforms. The migration notes cover it, and `trim`.
- The pipeline compares each step's value with the one it passed in, and checks a changed value for missing.
- Do not add named transforms such as `trim()` or `toLowerCase()` to core. Each is a one-line `transform()`.
