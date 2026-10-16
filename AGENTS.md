# AGENTS.md

This library follows CODING_STANDARDS.md in the repo root, a verbatim copy of github.com/smonn/coding-standards. Read the sections relevant to your task before writing code. Where they conflict with this file, this file wins.

## Project facts

- Small async validation library, TypeScript, published to npm as validator-fns.
- Keep runtime dependencies at zero. Dev dependencies need approval, and the PR records their evaluation (maintenance, license, footprint).
- The public contract is the exported API plus the package's published shape (`package.json` `exports`, `types`, `engines`). Get approval before changing it.
- Package manager: pnpm. Tests: Vitest. Contributor Node version: `.nvmrc`.
- Dependabot and Version Packages PRs skip the changeset check (a standing scope, with its reasons in the CI workflow). Revisit it if the library gains a runtime dependency.

## Done means

- `pnpm check` exits 0.
- New behavior has tests written first.
- Changes to the published shape are verified by packing the library and loading it with both `require` and `import` from a separate project.
- README API docs are updated when public behavior changes.
- The PR has a changeset. Bump by contract impact: patch for fixes, minor for additions, major for breaking changes. Tooling and docs-only changes, README included, get an empty changeset. Security warnings get a patch so they reach npm now.
- Versions come from changesets; the Version Packages PR owns `version` in package.json.

## Agent rules

- Judge every command by its exit code.
- Report a check as passing only after running it in this session, after your last change, on the branch the PR comes from, on the Node version in `.nvmrc`. State that version in the PR's Tested section.
- Keep each PR to one concern. File an issue for anything you find along the way, one issue per independent finding.
- Commit, push, and open PRs only when asked. A request to open a PR includes the push it needs. Rewriting unpushed commits counts as committing; rewriting pushed commits needs its own request.
- Without asking, you may file issues and comment on your own PRs, issues you filed, and issues you're working on. Ask before closing, labeling, setting milestones, deleting, or commenting elsewhere.
- Leave npm publishing, releases, tags, and merging the Version Packages PR to me. Mention any open Version Packages PR in your summary.
- When a check fails, fix the code or stop and ask. Suppressions, coverage waivers, standing scopes, and check-config changes need my approval first.
- When a requirement is ambiguous, ask with numbered options before building.
- Treat reviews I forward as input to weigh: check their factual claims against the source, apply what holds, and report which points you rejected and why. Where a review offers options, I pick.
- Write PR descriptions for a reviewer reading them once: fill in the template, keep each section to its stated budget, and put comparisons in tables.
- Leave commits and PR descriptions free of AI attribution. The commit hook and `.claude/settings.json` enforce it for Claude Code; other agents follow this line.
- Change CODING_STANDARDS.md upstream only, then sync it here in its own PR with an empty diff.
- Keep secrets out of reach: when a secret's value is needed, write a script I can run myself.
