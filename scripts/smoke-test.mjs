// Installs the packed package into an empty project and loads it the way
// consumers do, through both the require and the import conditions. This
// catches export map paths that point at files missing from the tarball.
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
  console.log(
    `Smoke test passed on Node.js ${process.version}: ${required.length} exports via require and import`,
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
