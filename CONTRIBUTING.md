# How to contribute

First of all, thank you for taking the time to contribute to this project. We've tried to make a stable project and try to fix bugs and add new features continuously. You can help us do more.

## Getting started

### Check out the road map

We have some functionalities in mind and we have issued them and there is a _milestone_ label available on the issue. If there is a bug or a feature that is not listed in the **issues** page or there is no one assigned to the issue, feel free to fix/add it! Although it's better to discuss it in the issue or create a new issue for it so there is no conflicting code.

### Writing some code!

Contributor tooling needs Node 22, version 22.18 or later, which tsdown requires. `.nvmrc` pins the major version, so `nvm use` picks it up. `devEngines` in `package.json` makes every pnpm command, including the pre-commit hook, fail on any other Node version, with a message that names the required one. Change both together when moving to a new major.

`packageManager` in `package.json` pins the pnpm version, and CI uses it. pnpm 10 or later switches to the pinned version on its own. Dependabot doesn't bump the pin, so bump it by hand: run `pnpm self-update <version>`, then `pnpm install`, which updates the pnpm entry at the top of `pnpm-lock.yaml`, and commit both files. `benchmark/package.json` pins the same version, so that `pnpm check` installs the benchmark with it; bump it the same way in `benchmark/`.

A path-based ignore in a check's config (`.oxfmtrc.json`, `.oxlintrc.json`, `.rev-dep.config.jsonc`) needs a comment next to it with its reason. `pnpm check` fails when an ignore matches no tracked file, so renaming an ignored file means updating its ignore.

Contributing to a project on GitHub is pretty straight forward. If this is you're first time, these are the steps you should take.

- Fork this repo.

And that's it! Read the code available and change the part you don't like! You're change should not break the existing code and should pass the tests.

If you're adding a new functionality, start from the branch **main**. It would be a better practice to create a new branch and work in there.

`pnpm fta` checks each file in `src/` against the FTA score threshold: below 50. A file over it has a baseline in `fta-baseline.json`. The check fails when a file scores worse than its baseline, and also when it scores better, so that the baseline follows each improvement. Run `pnpm fta:update` to lower or remove baselines, then commit the file. Raising a baseline, or adding one for a file, loosens the check and needs the maintainer's approval.

When you're done, submit a pull request and for one of the maintainers to check it out. We would let you know if there is any problem or any changes that should be considered.

### Issues and pull requests

Report bugs and request features with the [issue forms](https://github.com/smonn/validator-fns/issues/new/choose), and ask questions in [Discussions](https://github.com/smonn/validator-fns/discussions). A pull request starts from the [pull request template](.github/PULL_REQUEST_TEMPLATE.md): fill in each section, and run `pnpm check` before you open it. The "decisions answered" check fails while the description's "Decisions needed" section has content, and it re-runs when you edit the description.

### Changesets

Every pull request adds a changeset, a small file in `.changeset/` that records the version bump and the changelog entry. `pnpm check` fails without one. CI skips the check for two kinds of pull request: Dependabot's, which only touch dev tooling, and the Version Packages pull request, which consumes the changesets it releases.

- Run `pnpm changeset` and pick the bump: `major` for a change that breaks the exported API or `package.json` `exports`, `types`, or `engines`, `minor` for a new feature, `patch` for a fix. Write the summary for library users.
- For tooling, tests, and docs-only changes, README included, run `pnpm changeset --empty`. The npm page updates with the next release. A security warning is the exception: give it a `patch` so the warning reaches npm now.
- Stage the new file before running `pnpm check`. The check reads changesets from git, so an untracked file doesn't count.
- A pull request stacked on another pull request's branch needs its own changeset. In CI the check compares against the base branch, so the base pull request's changeset doesn't count. Locally it compares against `main`; set `GITHUB_BASE_REF` to the base branch name to match CI.
- Leave `version` in `package.json` and `CHANGELOG.md` to the Version Packages pull request, which generates both from changesets.

### Releases

The maintainer releases. When a pull request with a changeset merges, CI opens or updates a Version Packages pull request that bumps `version` and writes `CHANGELOG.md`. Merging that pull request runs `pnpm check`, publishes to npm through trusted publishing, and creates the git tag and GitHub release.

CI doesn't run on the Version Packages pull request by itself, because GitHub Actions opens and updates it. To release:

1. Close and reopen the Version Packages pull request. Reopening is your event, so CI runs.
2. Wait for the checks to pass.
3. Merge it right away. If another pull request merges first, the action updates the Version Packages pull request without running CI, so close and reopen it again.

If `pnpm check` fails in that release run, `main` has the version bump but nothing is published. Fix the failure in a follow-up pull request. If the fix changes the library, give it a patch changeset that says the previous version failed to publish; the next Version Packages pull request releases the following patch version, and the failed version is never published. Otherwise give it an empty changeset, merge it, and run the Continuous Deployment workflow by hand on `main` (Actions, Continuous Deployment, Run workflow). The manual run publishes the version in `package.json` if it isn't on npm, and does nothing if it is. It fails while a changeset with a version bump is pending, because those changes belong in the next version.

### Next major release

The next major version is built on the `next` branch in Changesets pre mode, so `main` keeps releasing patches and features for the current one.

- Issues in the next major's milestone branch from `next`, and their pull requests target it. Add changesets as usual. Locally, set `GITHUB_BASE_REF=next` so the changeset check compares against `next`.
- Merging into `next` opens or updates a Version Packages (next) pull request, which releases the same way as `main`'s. It publishes a prerelease such as `3.0.0-next.0` under the `next` dist-tag (`npm install validator-fns@next`) and creates a GitHub prerelease. The manual run for a stranded version works on `next` too.

After each release from `main`, merge `main` into `next`:

1. `git switch -c sync/next-<date> origin/next`, then `git merge origin/main`.
2. Resolve the conflicts in `next`'s favor: keep its `version` in `package.json`, keep its `CHANGELOG.md` entries on top with `main`'s new entries below them, and keep the changesets it moved to `.changeset/pre/` that `main`'s release deleted.
3. Open a pull request into `next` and merge it with a merge commit.

To release the major version:

1. Merge `main` into `next` one last time.
2. Branch from `next`, run `pnpm changeset pre exit`, and commit it with an empty changeset.
3. Open a pull request into `main` and merge it with a merge commit. `main`'s Version Packages pull request then releases the major version, with every prerelease's changes in one changelog entry.

### Tests

We've written tests and you can run them to assure the stability of the code, just try `npm test`. If you're adding a new functionality please write a test for it.

`test/properties.test.ts` holds property-based tests written with [fast-check](https://fast-check.dev). They run with the rest of the suite in `pnpm check`. A failing property prints the smallest input that breaks it and the seed that reproduces it.

Mutation testing with [StrykerJS](https://stryker-mutator.io) runs every Monday in the Mutation Testing workflow, and on pull requests that change `stryker.config.mjs` or the workflow. Run it locally with `pnpm mutation`. It fails when the mutation score drops below `thresholds.break` in `stryker.config.mjs`. Raise that threshold as the score improves; lowering it loosens the check and needs the maintainer's approval.

### Documentation

Every chunk of code that may be hard to understand has some comments above it. If you write some new code or change some part of the existing code in a way that it would not be functional without changing it's usages, it needs to be documented.
