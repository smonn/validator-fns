# validator-fns

## 2.0.2

### Patch Changes

- `require('validator-fns')` now resolves. The `require` export pointed outside `dist/` since 2.0.0, so CommonJS consumers and their type checkers failed to load the package (#489).

Releases before 2.0.2 are listed on [GitHub Releases](https://github.com/smonn/validator-fns/releases).
