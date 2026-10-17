---
'validator-fns': patch
---

`object()` reads only the input's own properties. A missing field named like an inherited property, such as `constructor` or `toString`, now reaches its validator as `undefined`, so `required()` reports it instead of passing the inherited method.
