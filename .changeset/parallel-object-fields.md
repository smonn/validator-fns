---
'validator-fns': major
---

`object()` runs its property validators concurrently instead of one after another, so async validators such as server lookups no longer wait for each other. Each one starts before any finishes, so custom validators that rely on running in order, or that share state, need to handle running at the same time. The valid value and `errors` keep the schema's key order, and object-level tests still run only after every property passes.
