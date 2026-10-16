// Selects the mode for a manual run of the release workflow, which publishes a
// version that a failed release run left unpublished on main. It prints
// mode=publish when the version in package.json isn't on npm, and mode=none
// when it is. It fails while a changeset with a version bump is pending: those
// changes belong in the next version, so they go through the Version Packages
// PR instead of shipping under the stranded version's number. Empty changesets
// don't block it. In GitHub Actions the mode goes to GITHUB_OUTPUT.
import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const changesetDir = fileURLToPath(new URL('../.changeset', import.meta.url));

// A changeset's frontmatter lists its bumps, one per line; an empty changeset
// has none. `changeset status` would report this too, but it also fails
// whenever packages differ from the base branch without a changeset.
const bumping = readdirSync(changesetDir)
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .filter((file) => {
    const content = readFileSync(join(changesetDir, file), 'utf8');
    const frontmatter = /^---\r?\n([\s\S]*?)^---$/m.exec(content);
    // A changeset without frontmatter is malformed, so it blocks too.
    return !frontmatter || frontmatter[1]?.trim() !== '';
  });
if (bumping.length > 0) {
  console.error(
    `Pending changesets with a version bump: ${bumping.join(', ')}. Release them through the Version Packages PR instead.`,
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const changesetBin = require.resolve('@changesets/cli/bin.js');
const planFile = join(
  mkdtempSync(join(tmpdir(), 'stranded-release-')),
  'publish-plan.json',
);
const { status, error } = spawnSync(
  process.execPath,
  [changesetBin, 'publish-plan', '--output', planFile],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
if (error) {
  throw error;
}
if (status !== 0) {
  console.error(`changeset publish-plan exited with ${status}.`);
  process.exit(1);
}

// The plan lists each package whose version isn't on npm.
/** @type {{ plan: unknown[] }} */
const { plan } = JSON.parse(readFileSync(planFile, 'utf8'));
const mode = plan.length > 0 ? 'publish' : 'none';
console.log(
  mode === 'publish'
    ? 'The version in package.json is not on npm.'
    : 'The version in package.json is already on npm.',
);

const githubOutput = process.env['GITHUB_OUTPUT'];
if (githubOutput) {
  appendFileSync(githubOutput, `mode=${mode}\n`);
} else {
  console.log(`mode=${mode}`);
}
