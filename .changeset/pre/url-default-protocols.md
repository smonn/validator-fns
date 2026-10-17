---
'validator-fns': major
---

`url()` now allows only `http:` and `https:` URLs by default, so `javascript:` and `data:` URLs are invalid. Pass a list of protocols to allow others; the list replaces the default, so include `http:` and `https:` in it if you still want them.
