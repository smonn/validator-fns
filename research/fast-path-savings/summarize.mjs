// Usage: node summarize.mjs <results.jsonl> <all.csv>
// Prints a Markdown table per removed fast path (its relevant scenarios) and
// writes every build and scenario to <all.csv>.
import { readFileSync, writeFileSync } from 'node:fs';

const [resultsFile, csvFile] = process.argv.slice(2);
const rows = readFileSync(resultsFile, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));
const branch = rows[0].branch;

const suiteRows = [
  'suite: simple (distinct values)',
  'suite: complex (distinct values)',
  'suite: complex (invalid values)',
];
const relevant = {
  main: {
    'no-array-fast-path': ['parseArray(array)', 'array(string) validator'],
    'no-boolean-fast-path': ['parseBoolean(boolean)', 'boolean validator'],
    'no-string-fast-path': ['parseString(string)', 'string validator, 3 tests'],
    'no-number-number-fast-path': [
      'parseNumber(number)',
      'number validator (number)',
    ],
    'no-number-string-fast-path': [
      'parseNumber(string)',
      'number validator (string)',
    ],
    'no-sync-tests': [
      'string validator, 3 tests',
      'number validator (number)',
      'array(string) validator',
    ],
  },
  next: {
    'no-array-fast-path': ['parseArray(array)', 'array(string) validator'],
    'no-boolean-fast-path': ['parseBoolean(boolean)', 'boolean validator'],
    'no-string-fast-path': ['parseString(string)', 'string validator, 2 tests'],
    'no-unbox-early-return': [
      'parseNumber(string)',
      'parseString(number)',
      'parseString(boolean)',
      'parseString(bigint)',
      'number validator (string)',
    ],
    'no-sync-twin': [
      'string validator, 2 tests',
      'number validator (number)',
      'array(string) validator',
    ],
  },
}[branch];

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1),
  );
  return {
    n: values.length,
    median,
    min: sorted[0],
    max: sorted.at(-1),
    cv: (sd / mean) * 100,
  };
}

const groups = new Map();
for (const { build, scenario, ops } of rows) {
  const key = `${build}\t${scenario}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(ops);
}
const get = (build, scenario) => stats(groups.get(`${build}\t${scenario}`));

const fmt = (ops) =>
  ops >= 1e6 ? `${(ops / 1e6).toFixed(2)}M` : `${(ops / 1e3).toFixed(1)}k`;
const pct = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;

const csv = ['build,scenario,n,median,min,max,cv_pct,saving_pct_vs_build'];
for (const key of groups.keys()) {
  const [build, scenario] = key.split('\t');
  const s = get(build, scenario);
  const base = get('baseline', scenario);
  const saving = build === 'baseline' ? '' : (base.median / s.median - 1) * 100;
  csv.push(
    [
      build,
      JSON.stringify(scenario),
      s.n,
      s.median.toFixed(0),
      s.min.toFixed(0),
      s.max.toFixed(0),
      s.cv.toFixed(2),
      saving === '' ? '' : saving.toFixed(2),
    ].join(','),
  );
}
writeFileSync(csvFile, `${csv.join('\n')}\n`);

for (const [build, scenarios] of Object.entries(relevant)) {
  console.log(`\n#### ${branch}: ${build}\n`);
  console.log(
    '| Scenario | With (median ops/s) | Without | Saving | Per call | With: min–max, CV | Without: min–max, CV | Ranges overlap |',
  );
  console.log('|---|---:|---:|---:|---:|---|---|---|');
  for (const scenario of [...scenarios, ...suiteRows]) {
    const w = get('baseline', scenario);
    const wo = get(build, scenario);
    const saving = (w.median / wo.median - 1) * 100;
    const overlap = w.min <= wo.max && wo.min <= w.max;
    const ns = (1 / wo.median - 1 / w.median) * 1e9;
    console.log(
      `| ${scenario} | ${fmt(w.median)} | ${fmt(wo.median)} | ${pct(saving)} | ${ns.toFixed(ns < 10 && ns > -10 ? 1 : 0)} ns | ${fmt(w.min)}–${fmt(w.max)}, ${w.cv.toFixed(1)}% | ${fmt(wo.min)}–${fmt(wo.max)}, ${wo.cv.toFixed(1)}% | ${overlap ? 'yes' : 'no'} |`,
    );
  }
}
