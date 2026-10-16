# How to contribute

First of all, thank you for taking the time to contribute to this project. We've tried to make a stable project and try to fix bugs and add new features continuously. You can help us do more.

## Getting started

### Check out the road map

We have some functionalities in mind and we have issued them and there is a _milestone_ label available on the issue. If there is a bug or a feature that is not listed in the **issues** page or there is no one assigned to the issue, feel free to fix/add it! Although it's better to discuss it in the issue or create a new issue for it so there is no conflicting code.

### Writing some code!

Contributor tooling needs Node 22.11 or later. `.nvmrc` pins the major version, so `nvm use` picks it up.

`packageManager` in `package.json` pins the pnpm version, and CI uses it. pnpm 10 or later switches to the pinned version on its own. Dependabot doesn't bump the pin, so bump it by hand: run `pnpm self-update <version>`, then `pnpm install`, which updates the pnpm entry at the top of `pnpm-lock.yaml`, and commit both files.

Contributing to a project on GitHub is pretty straight forward. If this is you're first time, these are the steps you should take.

- Fork this repo.

And that's it! Read the code available and change the part you don't like! You're change should not break the existing code and should pass the tests.

If you're adding a new functionality, start from the branch **main**. It would be a better practice to create a new branch and work in there.

When you're done, submit a pull request and for one of the maintainers to check it out. We would let you know if there is any problem or any changes that should be considered.

### Issues and pull requests

Report bugs and request features with the [issue forms](https://github.com/smonn/validator-fns/issues/new/choose), and ask questions in [Discussions](https://github.com/smonn/validator-fns/discussions). A pull request starts from the [pull request template](.github/PULL_REQUEST_TEMPLATE.md): fill in each section, and run `pnpm check` before you open it.

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

If `pnpm check` fails in that release run, `main` has the version bump but nothing is published. Fix the failure in a follow-up pull request with a patch changeset that says the previous version failed to publish. An empty changeset won't work: the release workflow does nothing while any changeset is pending, so the bumped version would stay unpublished. The next Version Packages pull request releases the following patch version, and the failed version is never published.

### Tests

We've written tests and you can run them to assure the stability of the code, just try `npm test`. If you're adding a new functionality please write a test for it.

### Documentation

Every chunk of code that may be hard to understand has some comments above it. If you write some new code or change some part of the existing code in a way that it would not be functional without changing it's usages, it needs to be documented.
