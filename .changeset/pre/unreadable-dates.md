---
'validator-fns': major
---

`date()` fails a non-blank string that isn't ISO 8601, such as `'tomorrow'` or `'12/31/2020'`, with `Failed to parse value to date.`, instead of reading it as an invalid date, which counts as missing. A typo in a date field no longer reports `'Required.'`, and `optional(date())` no longer accepts it. Blank strings and invalid `Date` objects still count as missing. `parseDate` throws a `TypeError` for the same strings.
