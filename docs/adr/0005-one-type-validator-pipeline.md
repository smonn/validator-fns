---
status: accepted
---

# One type-validator pipeline

## Context

In 2.x, `createTypeValidatorTest`, `array()` and `object()` each run their own parse, default, missing, test-loop and throw handling, and they drift (#684, #685). `optional()` reads a twin that every built-in builds and stores. v3 adds coerce twins, `withMessages()` translations that must reach nested failures, and custom types built from a parser, and each of them has to work with `optional()` in either wrapping order. Valibot and Zod give every schema an internal run protocol and pass a context down the call, so messages are resolved when a failure is created.

## Decision

Decided in #693:

- **One internal `defineType(def)` builds every type validator.** The built-ins, coerce twins and custom types all go through it. A def supplies a parser and optional coerce, gate and children slots, plus the object's build from its children. The public `createTypeValidator(parser)` is a one-line adapter over it, and a custom parser's failure keeps its own code.
- **`optional()` rebuilds instead of reading a stored twin.** The pipeline keeps each validator's def privately, and `optional()` rebuilds it with the optional exit, reaching through `withMessages()` and coerce twins. A validator without a def gets the generic wrapper.
- **Translations are filled in after the run.** `withMessages()` walks the failure tree and fills only failures created without a message, innermost first, per code. A private marker records that no message was supplied, separate from the fallback to the code. A validator's `messages` config words only the failures it raises itself.
- **The run is synchronous until a step or child returns a promise.** The safe call and `~standard.validate` still return a Promise.

## Considered options

- **A run protocol and context on every validator, as in Valibot and Zod.** Messages would resolve at creation with the value at hand. But validators written by users don't carry the protocol, so their failures would still need a fill-in walk, which leaves two mechanisms.
- **A list of same-shaped stages compiled into a validator.** Best for future wrappers, but every type module has to learn the phase rules, and a fill rule exists only for `default` and the object build.
- **Built-ins made only with the public factory.** It dogfoods `createTypeValidator`, but `object()` would need two pipelines to build its default from its children.
- **"No message supplied" read as `message === code`.** No bookkeeping, but a supplied message equal to its code, as in `min(2, 'min')`, would be translated over.

## Consequences

- A failure copied with spread loses the private marker, so a translation no longer fills it.
- A user-wrapped `min`, `max` or `exact` loses the gate marker. It runs as a collection test after the children, which is correct but not gated.
- A new wrapper like `optional()` must rebuild the def too, or it gets the generic wrapper's behaviour.
