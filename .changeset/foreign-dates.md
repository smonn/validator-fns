---
'validator-fns': patch
---

Fix dates from another realm, such as an iframe or `vm.runInNewContext()`, not being recognised. `parseDate()` read one as an invalid date, `minDate()` and `maxDate()` rejected it as a limit or a value, `required()` let an invalid one through, `oneOf()` didn't match it, and `number()` and `string()` didn't read it as a date.

Every date site now reads a date's time with `Date.prototype.getTime` and its text with `Date.prototype.toISOString`, so a date's own or subclass `getTime`, `valueOf` or `toISOString` no longer changes the result. An object that only inherits from `Date.prototype`, a `Proxy` around a date, and a date given `Object.prototype` or a `null` prototype are no longer taken for dates.
