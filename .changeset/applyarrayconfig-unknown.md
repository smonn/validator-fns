---
'validator-fns': major
---

`applyArrayConfig` no longer takes a type parameter and returns `unknown[] | null | undefined`. Remove the type argument from calls such as `applyArrayConfig<string>(config, value)`, and check the items' type where you use them.
