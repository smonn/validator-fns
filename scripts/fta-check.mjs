// Checks each file's FTA score against the threshold in CODING_STANDARDS.md:
// below 50. A file that doesn't meet it yet has a baseline in
// fta-baseline.json, its score rounded to 2 decimals, the precision the check
// compares at. The check fails when a file scores worse than its baseline, and
// also when it scores better, so that the baseline moves with it. `--update`
// lowers and removes baselines to match the current scores. It never raises a
// baseline or adds one; that loosens the check and needs approval.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runFta } from 'fta-cli';

const threshold = 50;
const baselineFile = 'fta-baseline.json';
const update = process.argv.includes('--update');

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

/** @type {Partial<Record<string, number>>} */
const baselines = JSON.parse(readFileSync(baselineFile, 'utf8'));

/** @type {import('fta-cli').AnalyzedFile[]} */
const analyzed = JSON.parse(runFta('src', { json: true }));
const scores = new Map(
  analyzed.map((file) => [
    `src/${file.file_name}`,
    Math.round(file.fta_score * 100) / 100,
  ]),
);

/** Failures `--update` can't fix. */
const failures = [];
/** Baselines that no longer match, which `--update` fixes. */
const stale = [];
/** @type {Record<string, number>} */
const nextBaselines = {};

/**
 * @param {string} file
 * @param {number} score
 * @param {number} baseline
 */
function compareWithBaseline(file, score, baseline) {
  if (score > baseline) {
    failures.push(
      `${file} scores ${score}, worse than its baseline ${baseline}.`,
    );
    nextBaselines[file] = baseline;
  } else if (score >= threshold) {
    nextBaselines[file] = score;
    if (score < baseline) {
      stale.push(`${file} improved from ${baseline} to ${score}.`);
    }
  } else {
    stale.push(
      `${file} scores ${score}, below ${threshold}, so it needs no baseline.`,
    );
  }
}

for (const [file, score] of scores) {
  const baseline = baselines[file];
  const limit =
    baseline === undefined ? `below ${threshold}` : `baseline ${baseline}`;
  console.log(`${file}: ${score} (${limit})`);
  if (baseline !== undefined) {
    compareWithBaseline(file, score, baseline);
  } else if (score >= threshold) {
    failures.push(
      `${file} scores ${score}. A file without a baseline must score below ${threshold}.`,
    );
  }
}
for (const file of Object.keys(baselines)) {
  if (!scores.has(file)) {
    stale.push(`${file} has a baseline but no longer exists.`);
  }
}

if (update) {
  const sorted = Object.fromEntries(
    Object.entries(nextBaselines).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(baselineFile, `${JSON.stringify(sorted, null, 2)}\n`);
  for (const line of stale) {
    console.log(`Updated: ${line}`);
  }
} else if (stale.length > 0) {
  failures.push(
    ...stale,
    `Run \`pnpm fta:update\` to update ${baselineFile}, and commit it.`,
  );
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
