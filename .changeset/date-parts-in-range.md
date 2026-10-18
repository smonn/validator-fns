---
'validator-fns': major
---

A date string with a part out of its range, such as `'2020-13'`, `'2020-02-30'`, `'2020-01-01T24:00'` or a UTC offset of `+24:00`, is no longer read. A `minDate()` or `maxDate()` limit like that throws ``TypeError('`limit` must be a valid date')`` when the test is built, and `coerce.date()` fails it with `type`, instead of rolling it over into the next month or day. The years 0 to 99 read as written, so `'0050-01-01'` is the year 50, not 1950.
