---
'validator-fns': major
---

Only `undefined` and `null` are missing. They fail with `required`, `optional()` returns them as they are, and a `parser` never gets them. `''`, `NaN` and an invalid `Date` are present: `string()` accepts `''`, so add `min(1)` to reject it, and `number()`, `date()` and `boolean()` fail them with `type`.

Each type validator accepts only its own type and fails anything else with `type`: `string()` strings, `number()` finite numbers, `boolean()` booleans, `date()` valid `Date` instances, `array()` arrays, and `object()` objects other than arrays, functions and boxed primitives. In 2.x, `number('42')` was `42`, `string(42)` was `'42'`, `boolean('false')` was `true` and `array('abc')` was `['a', 'b', 'c']`. A `Date` from another realm, such as an iframe, now passes `date()` and matches in `oneOf()` and as a `minDate()` or `maxDate()` limit. An invalid `Date` as a limit throws a `TypeError` when the test is built.
