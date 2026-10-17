---
status: accepted
---

# Error codes, not built-in messages

## Context

In 2.x, every built-in test takes a required message (`min(2, 'Too short.')`), and a missing value fails with `requiredMessage` or `'Required.'`. Parsers and Standard Schema add more fixed English: `'Failed to parse value to number.'` and `'Invalid value.'`. A failure carries only `message: string`, and nested failures in `errors` are message strings. A program can't tell which check failed without matching on wording, and an app can't translate messages without supplying every one by hand. Standard Schema requires a `message: string` on every issue. Its `validate(value, options?)` can carry vendor-specific parameters in `options.libraryOptions`, but `options` is optional, so an integration may pass only the value.

## Decision

Decided in #699. Failures carry codes, and the core library ships no wording:

- **Every failure is `{ code, params, message }`**: the top-level result, each nested failure, and each Standard Schema issue. A built-in code is the name of the test that failed (`min`, `oneOf`, `minDate`, …), plus `required`, `type`, `unknownKeys`, `items` and `properties`. Custom failures name their own code.
- **`message` is always a string.** With no message supplied, it is the code.
- **Messages live on the validator**, so `~standard` sees them. A built-in test's message argument is optional, and a type validator's `messages` config, keyed by code, replaces `requiredMessage`. `withMessages(validator, messages)` binds a translation to a whole validator tree, and locales ship as subpath exports, starting with `validator-fns/en`.
- **The closest message wins:** the test's own or the config's message, then the closest `withMessages()`, then the code.

## Considered options

- **Built-in English defaults in core.** Friendlier out of the box, but it keeps the wording v3 sets out to drop.
- **Locale entry points**, where `validator-fns/en` re-exports the whole API with English defaults. That needs no new function, but every locale duplicates the surface.
- **A per-call message map.** It suits a locale per request, and it could reach `~standard.validate` through `options.libraryOptions`. But an integration that passes only the value would show bare codes. Messages bound to the validator reach every consumer, whatever options it passes.
- **Global `configure()`.** Mutable module state shared by every user of the library in a process.
- **Zod-style semantic codes** (`too_small`, `invalid_type`). Familiar, but `min` and `minDate` would share a code and differ only in params.

## Consequences

- `requiredMessage`, the `limit` message key and required message arguments go away in v3. The 2.x deprecations and the migration notes cover them.
- Without a translation or supplied messages, users see codes such as `min`. The README shows `withMessages(schema, en)`.
- `package.json` `exports` gains a subpath for each locale.
- The pipeline must track whether a message was supplied, apart from the code fallback, so that a translation fills only the gaps.
- Do not add wording back to core to make results "readable by default". A locale subpath is the place for wording.
