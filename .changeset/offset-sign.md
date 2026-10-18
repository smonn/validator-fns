---
'validator-fns': patch
---

Fix `parseDate()`, `minDate()` and `maxDate()` reading ISO text with a UTC offset, such as `2026-10-17T08:30:00+02:00`, as the wrong instant. They added the offset instead of subtracting it, so the result was off by twice the offset. Text with `Z` or without a timezone was read correctly.
