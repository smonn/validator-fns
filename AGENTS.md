# AGENTS.md

This library follows CODING_STANDARDS.md (from github.com/smonn/coding-standards). Read the sections relevant to your task before writing code. Where they conflict with this file, this file wins.

## Project facts

- Small async validation library, TypeScript, published to npm as validator-fns.
- Keep runtime dependencies at zero. Dev dependencies need approval, and the PR records their evaluation (maintenance, license, footprint). Dependabot PRs skip the changeset check because of this; revisit that skip if a runtime dependency arrives.
- The public contract is the exported API plus the package's published shape (`package.json` `exports`, `types`, `engines`). Get approval before changing it.
- Package manager: pnpm. Tests: Vitest. Contributor Node version: see `.nvmrc`. The `engines` field is the published support range and stays separate.

## Done means

- `pnpm check` exits 0. It covers the changeset, format, lint, typecheck, tests, coverage, build, and publint.
- The PR adds a changeset (see CONTRIBUTING.md), empty when users won't notice the change. Version bumps come from changesets; the Version Packages PR owns `version` in package.json and `CHANGELOG.md`.
- New behavior has tests written first.
- Changes to the published shape are verified by packing the library and loading it with both `require` and `import` from a separate project.
- README API docs are updated when public behavior changes.

## Agent rules

- Judge every command by its exit code rather than its output.
- Report a check as passing only after running it in this session, after your last change, on the branch the PR comes from.
- Keep each PR to one concern. File an issue for any bug you find along the way.
- Without asking, you may file issues and comment on your own PRs and issues. Ask before closing, labeling, setting milestones, deleting, or commenting elsewhere.
- Commit, push, and open PRs only when asked. A request to open a PR includes the push it needs. Rewriting unpushed commits counts as committing; rewriting pushed commits needs its own request.
- Commit messages carry no AI attribution trailers; the commit hook rejects them.
- PR and issue bodies carry no AI attribution either, such as a "Generated with Claude Code" footer.
- Leave npm publishing, releases, and tags to me. They happen when I merge the Version Packages PR. Mention any open Version Packages PR in your summary.
- When a check fails, fix the code or stop and ask. Suppressions, coverage waivers, and check-config changes need my approval first.
- When a requirement is ambiguous, ask with numbered options before building.
- Treat reviews I forward as input to weigh: check their factual claims against the source, apply what holds, and report which points you rejected and why. Where a review offers options, I pick.
- CODING_STANDARDS.md is a verbatim copy of smonn/coding-standards. Change it upstream, then sync it here in its own PR with an empty diff.
- Keep secrets out of reach: when a secret's value is needed, write a script I can run myself.
- Write PR descriptions for a reviewer reading them once: fill in the template, keep each section to its stated budget, and put comparisons (such as dependency evaluations) in tables.
