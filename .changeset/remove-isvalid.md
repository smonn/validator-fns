---
'validator-fns': major
---

Remove the deprecated `isValid` property from validation results. Replace `result.isValid` with `result.state === 'valid'`, which also narrows the result type.
