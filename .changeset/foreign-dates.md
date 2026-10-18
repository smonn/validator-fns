---
'validator-fns': patch
---

Fix dates from another realm, such as an iframe or `vm.runInNewContext()`, not being recognised. `parseDate()` read one as an invalid date, `minDate()` and `maxDate()` rejected it as a limit or a value, `required()` let an invalid one through, `oneOf()` didn't match it, and `number()` and `string()` didn't read it as a date. Every date site now reads the time with `Date.prototype.getTime`, so a date's own `valueOf` or `getTime` can't change the result. An object that only inherits from `Date.prototype`, or a `Proxy` around a date, is no longer taken for one.
