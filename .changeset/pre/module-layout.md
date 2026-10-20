---
'validator-fns': major
---

Raises the supported browsers to Chrome and Edge 93, Firefox 92 and Safari 15.4 (iOS 15.4), from Chrome and Edge 85, Firefox 77 and Safari 13.1 (iOS 13.4). The library now uses `Object.hasOwn` and logical assignment (`||=`, `??=`). To support an older browser, polyfill `Object.hasOwn` and transpile logical assignment.
