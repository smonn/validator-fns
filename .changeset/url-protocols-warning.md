---
'validator-fns': patch
---

Document that `url()` without `protocols` accepts `javascript:` and `data:` URLs. Pass `['http:', 'https:']` when you render the value as a link.
