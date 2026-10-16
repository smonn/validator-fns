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
- Versions come from changesets; the Version Packages PR owns `version` in package.json and `CHANGELOG.md`.

## Working on issues

When I ask you to implement a set of issues:

1. Triage first. Read every issue and list the ones that need a decision from me: an ambiguous requirement, a public contract change, a new dependency, a suppression, waiver, standing scope or check-config change, or approaches with different tradeoffs. Ask them all at once, with numbered options and any measurements that settle them.
2. Work the rest while you wait. Only an issue with an open decision holds; the others proceed. A decision that comes up mid-work holds that issue too.
3. Use one branch and one PR per issue, branched from main. Stack branches only when one issue depends on another, and say so in both PRs.
4. Commit as you go, in small Conventional Commits, keeping structural and behavioral changes in separate commits. Tidy unpushed commits before pushing when it helps the reader.
5. Before pushing, review your full diff as a reviewer would, per the Review section of CODING_STANDARDS.md: read the surrounding code, confirm the tests fail when the code breaks, and refactor under green tests. Then run `pnpm check` per the rule below. Your review does not count as approval.
6. Push the branch and open the PR as a draft. Mark it ready for review once CI passes.
7. After pushing, add commits rather than rewriting history, unless I ask.
8. Stop an issue and report when a failing check needs a fix outside its scope, or the issue turns out much larger than described.
9. Finish with one summary: for each issue, its PR or the question it's waiting on.

Push only to branches you created. Merging is mine. Work only the issues I named, and file anything else you find as new issues.

## Agent rules

- Judge every command by its exit code.
- Report a check as passing only after running it in this session, after your last change, on the branch the PR comes from, on the Node version in `.nvmrc`. State that version in the PR's Tested section.
- Keep each PR to one concern. File an issue for anything you find along the way, one issue per independent finding.
- Outside Working on issues, commit, push, and open PRs only when asked. A request to open a PR includes the push it needs. Rewriting unpushed commits counts as committing; rewriting pushed commits needs its own request.
- Without asking, you may file issues and comment on your own PRs, issues you filed, and issues you're working on. Ask before closing, labeling, setting milestones, deleting, or commenting elsewhere.
- Leave npm publishing, releases, tags, and merging, the Version Packages PR included, to me. Mention any open Version Packages PR in your summary.
- When a check fails, fix the code or stop and ask. Suppressions, coverage waivers, standing scopes, and check-config changes need my approval first.
- When a requirement is ambiguous, ask with numbered options before building.
- Treat reviews I forward as input to weigh: check their factual claims against the source, apply what holds, and report which points you rejected and why. Where a review offers options, I pick.
- Write PR descriptions for a reviewer reading them once: fill in the template, keep each section to its stated budget, and put comparisons in tables.
- Leave commits and PR descriptions free of AI attribution. The commit hook and `.claude/settings.json` enforce it for Claude Code; other agents follow this line.
- Change CODING_STANDARDS.md upstream only, then sync it here in its own PR with an empty diff.
- Keep secrets out of reach: when a secret's value is needed, write a script I can run myself.
