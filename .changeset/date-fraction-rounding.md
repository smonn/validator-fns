---
'validator-fns': patch
---

Fix `parseDate()`, `minDate()` and `maxDate()` reading ISO text with a fraction of 17 or more digits, such as `2020-12-31T23:59:59.99999999999999999Z`, as the next second. They now use the first 3 digits, as `new Date()` does.
