---
'validator-fns': minor
---

`object(schema, ...tests)` takes object-level tests, which run on the parsed object once every property is valid. The new `check(path?, test, message)` compares fields and puts its message on a property, a nested path such as `['shipping', 'zip']`, or the object itself:

```ts
object(
  { password: string(required('Required.')), confirm: string() },
  check('confirm', (value) => value.confirm === value.password, 'Must match.'),
);
```
