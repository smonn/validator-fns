---
'validator-fns': patch
---

`matches()` now starts each test at index 0 when the pattern has the `g` or `y` flag. Before, a match advanced the pattern's `lastIndex`, so the next value could fail even when it matched, and the caller's `lastIndex` changed.
