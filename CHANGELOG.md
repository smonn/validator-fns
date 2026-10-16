# validator-fns

## 2.1.0

### Minor Changes

- 38b00d3: Add the `uuid(message)` validation test. It accepts RFC 9562 UUIDs of any version from 1 to 8, plus the nil and max UUIDs, in any letter case.

## 2.0.5

### Patch Changes

- 640c6c3: The RunKit example is now `runkit.cjs`. As `runkit.js` it loaded as an ES module, so its `require` call failed.

## 2.0.4

### Patch Changes

- f152ed5: Remove `engines.pnpm` from the published `package.json`. It applied to everyone installing validator-fns, so pnpm 8 and older failed to install it with `engine-strict` on. The library never needed a particular package manager. `engines.node` is unchanged.

## 2.0.3

### Patch Changes

- 6e6fdca: `matches()` now starts each test at index 0 when the pattern has the `g` or `y` flag. Before, a match advanced the pattern's `lastIndex`, so the next value could fail even when it matched, and the caller's `lastIndex` changed.
- 988a3ca: Type validators such as `string()` and `number()`, and validators built with `createTypeValidatorTest`, no longer cache results by value. The cache had no size limit, so memory grew with every distinct value, and a repeated value returned the first call's `field`.

  Custom tests now run on every call, including for a repeated value. If a custom test does expensive work, such as a server lookup, memoize it in the test.

- 62529a1: Document that `url()` without `protocols` accepts `javascript:` and `data:` URLs. Pass `['http:', 'https:']` when you render the value as a link.

## 2.0.2

### Patch Changes

- `require('validator-fns')` now resolves. The `require` export pointed outside `dist/` since 2.0.0, so CommonJS consumers and their type checkers failed to load the package (#489).

Releases before 2.0.2 are listed on [GitHub Releases](https://github.com/smonn/validator-fns/releases).
