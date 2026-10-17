---
'validator-fns': major
---

`date()` fails input that isn't a `Date`, number, or string, such as `true`, `{}`, or `[2020]`, with `Failed to parse value to date.`, instead of reading it as an invalid date, which counts as missing. `optional(date())` no longer accepts such input. `parseDate` throws a `TypeError` for it. `null` and `undefined` are still missing.
