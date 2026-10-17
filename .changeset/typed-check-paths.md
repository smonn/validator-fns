---
'validator-fns': major
---

`check()` types its `path` and its errors. The path must name properties of the parsed object, or a path into its nested objects, so a misspelled property is a type error. The test's error type is the errors it produces, such as `{ confirm?: string }` for `'confirm'` or `{ shipping?: { zip?: string } }` for `['shipping', 'zip']`, instead of a free type parameter `E`. An empty path `[]` is a type error; leave the path out instead. Runtime behavior is unchanged.
