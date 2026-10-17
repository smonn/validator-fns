---
'validator-fns': minor
---

New `standard(validator)` adds the [Standard Schema](https://standardschema.dev) interface to any validator, so libraries that accept a Standard Schema can use it. `~standard.validate` returns a promise; invalid results become issues with paths built from `errors`.
