// Checks for a changeset against the branch a pull request merges into, so a
// PR stacked on another PR needs its own changeset rather than passing on its
// base's. GitHub Actions sets GITHUB_BASE_REF on pull_request runs; elsewhere,
// including local runs, the check compares against main.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const changesetBin = require.resolve('@changesets/cli/bin.js');
const base = process.env['GITHUB_BASE_REF'] || 'main';

const { status, error } = spawnSync(
  process.execPath,
  [changesetBin, 'status', `--since=origin/${base}`],
  { stdio: 'inherit' },
);
if (error) {
  throw error;
}
process.exit(status ?? 1);
