# AGENTS.md

This library follows CODING_STANDARDS.md (from github.com/smonn/coding-standards). Read the sections relevant to your task before writing code. Where they conflict with this file, this file wins.

## Project facts

- Small async validation library, TypeScript, published to npm as validator-fns.
- Zero runtime dependencies. Never add one; dev dependencies need approval.
- The exported API is a public contract: changing or removing it is a semver-major change and needs approval first.
- Package manager: pnpm. Tests: Vitest.

## Done means

- `pnpm check` passes (format, lint, typecheck, tests, coverage).
- New behavior has tests written first.
- README API docs are updated when public behavior changes.

## Agent rules

- Do not commit or push unless asked. Commit and push are separate requests.
- Never add a suppression, coverage waiver, or check-config change to get a failing check to pass. Stop and ask instead.
- When a requirement is ambiguous, ask with numbered options before building.
- Do not read, print, or store secrets from any source.
- Judge every command by its exit code, never by grepping its output.
