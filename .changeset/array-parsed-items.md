---
'validator-fns': patch
---

`array(itemTest)` returns the values its item validator parsed, as its type always declared: `array(number())` now turns `['1', '2.5']` into `[1, 2.5]`, and `array(string({ trim: true }))` trims each item. It used to return the items as they came in.
