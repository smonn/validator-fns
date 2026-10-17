// Usage: node build-variants.mjs <branch: main|next> <source checkout> <out dir>
// Builds the baseline and one variant per removed fast path, runs the test
// suite against each, and copies each ESM bundle to <out dir>/<branch>/<name>.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { variants } from './variants.mjs';

const [branch, root, out] = process.argv.slice(2);
if (!variants[branch] || !root || !out) {
  console.error('Usage: node build-variants.mjs <main|next> <source> <out>');
  process.exit(2);
}

function run(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8' });
}

function build(name) {
  run('pnpm', ['build']);
  let tests = 'pass';
  try {
    run('pnpm', ['exec', 'vitest', 'run']);
  } catch (error) {
    tests = `FAIL\n${error.stdout}`;
  }
  const dir = join(out, branch, name);
  mkdirSync(dir, { recursive: true });
  cpSync(join(root, 'dist', 'index.js'), join(dir, 'index.js'));
  console.log(`${branch}/${name}: tests ${tests}`);
}

build('baseline');

for (const [name, edits] of Object.entries(variants[branch])) {
  const originals = new Map();
  try {
    for (const { file, from, to } of edits) {
      const path = join(root, file);
      if (!originals.has(path)) originals.set(path, readFileSync(path, 'utf8'));
      const text = readFileSync(path, 'utf8');
      const count = text.split(from).length - 1;
      if (count !== 1) {
        throw new Error(`${name}: expected one match in ${file}, got ${count}`);
      }
      writeFileSync(path, text.replace(from, () => to));
    }
    build(name);
  } finally {
    for (const [path, text] of originals) writeFileSync(path, text);
  }
}
