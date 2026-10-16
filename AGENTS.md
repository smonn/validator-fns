# AGENTS.md

This library follows CODING_STANDARDS.md (from github.com/smonn/coding-standards). Read the sections relevant to your task before writing code. Where they conflict with this file, this file wins.

## Project facts

- Small async validation library, TypeScript, published to npm as validator-fns.
- Keep runtime dependencies at zero. Dev dependencies need approval, and the PR records their evaluation (maintenance, license, footprint).
- The public contract is the exported API plus the package's published shape (`package.json` `exports`, `types`, `engines`). Get approval before changing it.
- Package manager: pnpm. Tests: Vitest. Contributor tooling needs Node 20.19+.

## Done means

- `pnpm check` exits 0. It covers format, lint, typecheck, tests, coverage, build, and publint.
- New behavior has tests written first.
- Changes to the published shape are verified by packing the library and loading it with both `require` and `import` from a separate project.
- README API docs are updated when public behavior changes.

## Agent rules

- Judge every command by its exit code rather than its output.
- Report a check as passing only after running it in this session, after your last change.
- Keep each PR to one concern. File an issue for any bug you find along the way.
- Commit and push only when asked, as separate requests.
- Commit messages carry no AI attribution trailers; the commit hook rejects them.
- PR and issue bodies carry no AI attribution either, such as a "Generated with Claude Code" footer.
- Leave npm publishing, releases, and tags to me. Propose them when they're due.
- When a check fails, fix the code or stop and ask. Suppressions, coverage waivers, and check-config changes need my approval first.
- When a requirement is ambiguous, ask with numbered options before building.
- Keep secrets out of reach: when a secret's value is needed, write a script I can run myself.
- Write PR descriptions for a reviewer reading them once: fill in the template, keep each section to its stated budget, and put comparisons (such as dependency evaluations) in tables.
