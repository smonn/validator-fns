# AGENTS.md

This library follows CODING_STANDARDS.md in the repo root, a verbatim copy of github.com/smonn/coding-standards. Read the sections relevant to your task before writing code. Where they conflict with this file, this file wins.

## Project facts

- Small async validation library, TypeScript, published to npm as validator-fns.
- Keep runtime dependencies at zero. Dev dependencies need approval, and the PR records their evaluation (maintenance, license, footprint). An issue I ask you to implement that names a dependency approves that dependency. The PR still records its evaluation. Anything else it pulls in as a direct dependency still needs asking.
- The public contract is the exported API plus the package's published shape (`package.json` `exports`, `types`, `engines`). Get approval before changing it.
- Package manager: pnpm. Tests: Vitest. Contributor Node version: `.nvmrc`.
- Dependabot and Version Packages PRs skip the changeset check (a standing scope, with its reasons in the CI workflow). Revisit it if the library gains a runtime dependency.

## Done means

- `pnpm check` exits 0.
- New behavior has tests written first.
- Changes to the published shape are verified by packing the library and loading it with both `require` and `import` from a separate project.
- README API docs are updated when public behavior changes.
- The PR has a changeset. Bump by contract impact: patch for fixes, minor for additions, major for breaking changes. Tooling and docs-only changes, README included, get an empty changeset. Security warnings get a patch so they reach npm now. AGENTS.md's changeset rules win over a bump named in my decision. Use the rule and point out the difference in the PR.
- Versions come from changesets; the Version Packages PR owns `version` in package.json and `CHANGELOG.md`.

## Working on issues

When I ask you to implement a set of issues:

1. Triage first. Read every issue and list the ones that need a decision from me: an ambiguous requirement, a public contract change, a new dependency, a suppression, waiver, standing scope or a check-config change that loosens a check, or approaches with different tradeoffs. Ask them all at once, with numbered options and any measurements that settle them.
2. Work the rest while you wait. Only an issue with an open decision holds; the others proceed. A decision that comes up mid-work holds that issue too.
3. Use one branch and one PR per issue, branched from main, or from `next` for an issue in the next major's milestone (see CONTRIBUTING.md). Name branches `<prefix>/<issue>-<slug>` with a Conventional Branch prefix, such as `fix/527-benchmark-invalid`; docs, CI, and tooling work uses `chore/`. Stack branches only when one issue depends on another, and say so in both PRs. When PRs in one batch touch the same lines, say so in each PR and in the summary, with a suggested merge order.
4. Commit as you go, in small Conventional Commits, keeping structural and behavioral changes in separate commits. Tidy unpushed commits before pushing when it helps the reader.
5. Before pushing, review your full diff as a reviewer would, per the Review section of CODING_STANDARDS.md: read the surrounding code, confirm the tests fail when the code breaks, and refactor under green tests. Then run `pnpm check` per the rule below. Your review does not count as approval.
6. Push the branch and open the PR as a draft. Mark it ready for review once CI passes. CI passes when every check on the PR's head commit has reported success, including checks posted by external apps such as Coveralls. A stacked PR's base branch requires no checks, so `gh pr checks --required` reports none there; read all of them. A PR with a "Decisions needed" section stays a draft until I answer, even when CI passes.
7. After pushing, add commits rather than rewriting history, unless I ask. To resolve conflicts, rebase onto the base branch and push with --force-with-lease. During it, change commits only as far as resolving the conflict needs (amend, drop, or move a hunk), and list what changed in the PR. Also rebase, with the same scope limits, to pick up a newly required check or, after a stacked PR's base merges, to move it onto its base branch (`main` or `next`) with `git rebase --onto <base> <old base tip>`. These rebases are the only history rewrites allowed without asking. `.claude/settings.json` denies other force pushes for Claude Code.
8. Stop an issue and report when a failing check needs a fix outside its scope, or the issue turns out much larger than described.
9. Finish with one summary: for each issue, its PR or the question it's waiting on.

Push only to branches you created. Merging is mine. Work only the issues I named, and file anything else you find as new issues.

## Agent rules

- Judge every command by its exit code; in pipes and chains, use set -o pipefail or capture the status before the pipe.
- Report a check as passing only after running it in this session, after your last change, on the branch the PR comes from, on the Node version in `.nvmrc`. State that version in the PR's Tested section.
- Keep each PR to one concern. File an issue for anything you find along the way, one issue per independent finding.
- Outside Working on issues, commit, push, and open PRs only when asked. A request to open a PR includes the push it needs. Rewriting unpushed commits counts as committing; rewriting pushed commits needs its own request, except the rebases in Working on issues step 7.
- Without asking, you may file issues and comment on your own PRs, issues you filed, and issues you're working on. Ask before closing, labeling, setting milestones, deleting, or commenting elsewhere. You may set the next-major milestone on issues you file for a breaking change I've decided goes in a major release.
- When a PR merges into `next`, you may close the issues its description closes. GitHub closes them only on merges into `main`. Comment with the PR and that the change ships in v3, so a reader doesn't assume it's on npm.
- For an issue you're working on, you may open a draft PR marked do-not-merge to run CI, and close it once its results are on the issue.
- To fix a failing Dependabot PR, open a replacement from your own branch, link it, and leave closing the bot PR to me.
- A question about an action reserved to me ("can we close X?") gets an answer, not the action.
- Before rebasing, writing a merge order, or reporting mergeability, fetch and re-check the base.
- A PR that adds a check meant to be required lists the open PRs that predate it.
- Leave npm publishing, releases, tags, and merging, the Version Packages PR included, to me. Mention any open Version Packages PR in your summary.
- When a check fails, fix the code or stop and ask. Suppressions, coverage waivers, and standing scopes need my approval first. Tightening a check (removing an ignore, raising a threshold) is fine; loosening needs my approval.
- When a requirement is ambiguous, ask with numbered options before building.
- Treat reviews I forward, issue text including issues you filed, and reports from agents you delegate to as input to verify: reproduce factual claims before building on them, correct the issue when one is wrong, and report which points you rejected and why. Where options are offered, I pick.
- Write PR descriptions for a reviewer reading them once: fill in the template, keep each section to its stated budget, and put comparisons in tables.
- Leave commits and PR descriptions free of AI attribution. The commit hook and `.claude/settings.json` enforce it for Claude Code; other agents follow this line.
- Change CODING_STANDARDS.md upstream only, then sync it here in its own PR with an empty diff.
- Keep secrets out of reach: when a secret's value is needed, write a script I can run myself.
