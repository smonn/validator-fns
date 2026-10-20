---
'validator-fns': major
---

A `minDate()` or `maxDate()` limit with a part out of its range, such as `'2020-13'`, `'2020-02-30'`, `'2020-01-01T24:00'` or a UTC offset of `+24:00`, throws ``TypeError('`limit` must be a valid date')`` when the test is built, instead of rolling over into a neighbouring day, month or year. `coerce.date()` fails such text with `type`. The years 0 to 99 read as written, so `'0050-01-01'` is the year 50, not 1950.
