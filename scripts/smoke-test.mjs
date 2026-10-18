// Installs the packed package into an empty project and loads it the way
// consumers do, through both the require and the import conditions, for the
// root and the validator-fns/en subpath. This catches export map paths that
// point at files missing from the tarball. It also runs the published RunKit
// example (`runkitExampleFilename`).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const listExports = {
  require:
    "console.log(JSON.stringify(Object.keys(require('validator-fns')).sort()))",
  import:
    "import * as v from 'validator-fns'; console.log(JSON.stringify(Object.keys(v).sort()))",
};

// en's messages call a chunk the root shares, so word a failure with both.
const wordInEnglish = {
  require: `const { string, min, withMessages } = require('validator-fns');
const { en } = require('validator-fns/en');
withMessages(string(min(3)), en)('ab').then((result) =>
  console.log(JSON.stringify([Object.keys(en).sort(), result.message])));`,
  import: `import { string, min, withMessages } from 'validator-fns';
import { en } from 'validator-fns/en';
const result = await withMessages(string(min(3)), en)('ab');
console.log(JSON.stringify([Object.keys(en).sort(), result.message]));`,
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

const workDir = mkdtempSync(join(tmpdir(), 'validator-fns-smoke-'));

try {
  run('pnpm', ['pack', '--pack-destination', workDir], packageRoot);
  const tarball = readdirSync(workDir).find((name) => name.endsWith('.tgz'));
  assert.ok(tarball, 'pnpm pack produced no tarball');

  const consumer = join(workDir, 'consumer');
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), '{ "private": true }\n');
  run(
    'npm',
    ['install', '--offline', '--no-audit', '--no-fund', join(workDir, tarball)],
    consumer,
  );

  /** @type {unknown} */
  const required = JSON.parse(
    run(process.execPath, ['--eval', listExports.require], consumer),
  );
  /** @type {unknown} */
  const imported = JSON.parse(
    run(
      process.execPath,
      ['--input-type=module', '--eval', listExports.import],
      consumer,
    ),
  );

  assert.ok(
    Array.isArray(required) && required.length > 0,
    'require exposed no exports',
  );
  assert.deepEqual(
    required,
    imported,
    'require and import expose different exports',
  );

  /** @type {unknown} */
  const requiredEn = JSON.parse(
    run(process.execPath, ['--eval', wordInEnglish.require], consumer),
  );
  /** @type {unknown} */
  const importedEn = JSON.parse(
    run(
      process.execPath,
      ['--input-type=module', '--eval', wordInEnglish.import],
      consumer,
    ),
  );
  assert.ok(
    Array.isArray(requiredEn) &&
      Array.isArray(requiredEn[0]) &&
      requiredEn[0].includes('min') &&
      requiredEn[1] === 'Must be at least 3 characters.',
    'validator-fns/en through require gave no English',
  );
  assert.deepEqual(
    importedEn,
    requiredEn,
    'require and import word validator-fns/en differently',
  );

  const runkit = run(
    process.execPath,
    [join('node_modules', 'validator-fns', 'runkit.cjs')],
    consumer,
  );
  assert.match(runkit, /firstName: 'Bob'/, 'runkit.cjs logged no valid result');

  console.log(
    `Smoke test passed on Node.js ${process.version}: ${required.length} exports and validator-fns/en via require and import, and runkit.cjs`,
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
