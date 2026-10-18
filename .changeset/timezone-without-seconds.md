---
'validator-fns': minor
---

`parseDate()`, `minDate()` and `maxDate()` now read ISO text with a timezone after the minutes, such as `2026-10-17T08:30Z` or `2026-10-17T08:30+02:00`, as that instant. They used to give an invalid date unless the text had seconds.
