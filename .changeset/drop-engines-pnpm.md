---
'validator-fns': patch
---

Remove `engines.pnpm` from the published `package.json`. It applied to everyone installing validator-fns, so pnpm 8 and older failed to install it with `engine-strict` on. The library never needed a particular package manager. `engines.node` is unchanged.
