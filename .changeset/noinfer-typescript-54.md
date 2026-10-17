---
'validator-fns': major
---

TypeScript 5.4 or later is required for the type declarations. `createTypeValidatorTest` now infers the config type from `applyConfig`, so a custom type validator no longer needs explicit type arguments to accept options that `defaultConfig` doesn't set. Explicit type arguments still work.
