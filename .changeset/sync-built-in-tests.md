---
'validator-fns': patch
---

Type validators run built-in tests without an `await` per test, which about doubles throughput for objects of simple fields. Results are unchanged, and every validator and test still returns a promise.
