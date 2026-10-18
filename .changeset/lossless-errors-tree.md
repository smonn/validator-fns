---
'validator-fns': major
---

An `array()` or `object()` failure's `errors` tree holds each failed child's failure as the child returned it, with its `code`, `params`, `message`, `field` and own `errors`, instead of its message. A valid array item is `null`, an object lists only its failed properties, and a child that failed through its own children is an `items` or `properties` failure with its own tree. A failed array test, such as `max()`, gives a failure without the items' errors. `ArrayItemValidatorResult` is gone: an array's errors are `(Failure<E> | null)[]`, and an object's have a `Failure` per key.

Every `field` is the full path from the caller's field, such as `user.a.b`, `user.tags[1].name`, or `[1]` for a root array's item, and messages with `{field}` get it. `check()` with a path puts its failure, with the full field, under a `properties` failure for the object and each name.

The new `messageTree(result)` gives the nested messages, `undefined` for a valid result, for form libraries such as Formik. Standard Schema issues carry `code` and `params` at every depth, one per leaf of the tree. Both throw a `TypeError` for a tree that isn't one, such as an entry that isn't a whole failure, one nested more than 1000 levels deep, which a cyclic tree also reaches, or one with more than 1,000,000 entries, counting a shared failure once for each entry that holds it.
