import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert, test } from 'vitest';

const script = path.join(import.meta.dirname, '../scripts/check-decisions.mjs');
const open = '## Why\n\nText.\n\n## Decisions needed\n\n1. Pick one.\n';
const answered = '## Why\n\nText.\n';

function run(body: string, others?: { number: number; body: string | null }[]) {
  const env: Record<string, string> = {
    PATH: process.env['PATH'] ?? '',
    PR_BODY: body,
    PR_NUMBER: '2',
  };
  if (others) {
    const file = path.join(
      mkdtempSync(path.join(tmpdir(), 'decisions-')),
      'prs.jsonl',
    );
    writeFileSync(file, others.map((pr) => JSON.stringify(pr)).join('\n'));
    env['SAME_HEAD_PRS'] = file;
  }
  return spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
}

test('passes a description without open decisions', () => {
  assert.strictEqual(run(answered).status, 0);
});

test('fails a description with open decisions', () => {
  const result = run(open);
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, '1. Pick one.');
});

test('fails when another open PR with the same head has open decisions', () => {
  const result = run(answered, [{ number: 1, body: open }]);
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, '#1');
});

test('passes when every open PR with the same head is answered', () => {
  const result = run(answered, [{ number: 1, body: answered }]);
  assert.strictEqual(result.status, 0);
});

test('reads the triggering PR from PR_BODY, not from the list', () => {
  // The list can lag behind an edit; the event's body is current.
  const result = run(answered, [{ number: 2, body: open }]);
  assert.strictEqual(result.status, 0);
});

test('treats a null body in the list as no decisions', () => {
  const result = run(answered, [{ number: 1, body: null }]);
  assert.strictEqual(result.status, 0);
});
