---
status: accepted
---

# Invalid input is data; bugs propagate

## Context

In 2.x, scalar type validators catch every throw and turn it into an invalid result whose message is the error's. `array()` and `object()` catch nothing, so the same throw rejects their promise (#684). The catch serves two purposes. Parsers throw a `TypeError` to signal unreadable input, and the catch turns that into a validation failure. But it also swallows programmer errors. A buggy test, a throwing `requiredMessage` function, or `number({ round: 'bogus' })` shows up as a validation message, not as a bug. v3 moves toward "parse, don't validate", with a safe call, `parse` and `is` as entry points (#696).

## Decision

Decided in #687. Validators separate invalid input from bugs:

- **Invalid input is always a failure result.** That includes unreadable input. The safe entry point never throws or rejects for it.
- **Bugs propagate unchanged from every validator and entry point.** A bug is a throw from user code: a test, a `requiredMessage` function, a custom child validator, or a parser bug. The rejection is the exact thrown value, not wrapped, so stack traces and `instanceof` keep working. Scalars and collections behave the same.
- **Bad configuration throws when the validator is built.** Validator factories check their config and throw a `TypeError` synchronously, as `object()` and `array()` already do for misuse.

## Considered options

- **Catch everything.** This is what 2.x scalars do. Every validator would always resolve, but bugs would surface as end-user validation messages.
- **Never catch, and parsers return failures.** This is close to the decision. But it gives up on a distinct failure path for unreadable input, which the parser protocol has to carry anyway.

## Consequences

- Removing the scalar catch is a v3 breaking change, and the migration notes call it out.
- A thrown error can no longer mean "unreadable input". Parsers, including a custom `parser` option, need a way to signal failure that isn't a plain throw; #691 decides how.
- Do not reintroduce a catch-all in the pipeline to make a validator "never reject". It hides bugs, and invalid input already never rejects.
