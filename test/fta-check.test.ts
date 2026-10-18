import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert, test } from 'vitest';

const root = path.join(import.meta.dirname, '..');

/** A file that scores 7.93. */
const small = `export function one(value: number): number {
  return value + 1;
}

export function two(value: number): number {
  return value * 2;
}

export const three = 3;
`;

/**
 * A file of one function with `count` branches. The scores, with fta-cli
 * pinned at 3.0.1: 44 scores 48.3, 46 scores 49.23, 47 scores 49.7 and 48
 * scores 50.14.
 */
function branches(count: number): string {
  return [
    'export function branches(x: number, y: string): string {',
    "  let out = '';",
    ...Array.from(
      { length: count },
      (_, i) =>
        `  if (x > ${i} && y.length < ${i * 3}) { out += y.slice(${i}) + String(x * ${i + 7}); }`,
    ),
    '  return out;',
    '}',
    '',
  ].join('\n');
}

/**
 * Runs a copy of the check in a project of its own, with `files` as its
 * `src/` and an empty baseline.
 */
function run(files: Record<string, string>) {
  const project = mkdtempSync(path.join(tmpdir(), 'fta-check-'));
  mkdirSync(path.join(project, 'scripts'));
  mkdirSync(path.join(project, 'src'));
  copyFileSync(
    path.join(root, 'scripts/fta-check.mjs'),
    path.join(project, 'scripts/fta-check.mjs'),
  );
  symlinkSync(
    path.join(root, 'node_modules'),
    path.join(project, 'node_modules'),
  );
  writeFileSync(path.join(project, 'fta-baseline.json'), '{}\n');
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(path.join(project, 'src', name), text);
  }
  return spawnSync(
    process.execPath,
    [path.join(project, 'scripts/fta-check.mjs')],
    { encoding: 'utf8' },
  );
}

test('should pass a file that scores just below the cap of 50', () => {
  const result = run({ 'below.ts': branches(47) });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.include(result.stdout, 'src/below.ts: 49.7 (below 50)');
});

test('should fail a file that scores just above the cap of 50', () => {
  const result = run({ 'above.ts': branches(48) });
  assert.strictEqual(result.status, 1);
  assert.include(
    result.stderr,
    'src/above.ts scores 50.14. A file without a baseline must score below 50.',
  );
});

test('should print the mean file score', () => {
  const result = run({ 'small.ts': small, 'branches.ts': branches(46) });
  assert.include(result.stdout, 'Mean: 28.58 (no threshold)');
});

test('should pass when the mean is near the cap', () => {
  const result = run({ 'a.ts': branches(44), 'b.ts': branches(47) });
  assert.include(result.stdout, 'Mean: 49 (no threshold)');
  assert.strictEqual(result.status, 0, result.stderr);
});
