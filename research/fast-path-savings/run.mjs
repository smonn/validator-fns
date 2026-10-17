// Usage: node run.mjs <main|next> <variants dir> <runs> <measure ms> <out.jsonl>
// Each round runs every scenario against every build in a fresh process, with
// builds in a new random order per round, so drift spreads across builds.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scenarios } from './scenarios.mjs';

const [branch, variantsDir, runsArg, msArg, outFile] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const builds = readdirSync(join(variantsDir, branch));
const baseline = join(variantsDir, branch, 'baseline', 'index.js');
const names = Object.keys(
  scenarios(branch, await import(pathToFileURL(baseline).href)),
);

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

for (let run = 1; run <= Number(runsArg); run++) {
  for (const build of shuffle(builds)) {
    for (const scenario of names) {
      const bundle = join(variantsDir, branch, build, 'index.js');
      const output = execFileSync(
        process.execPath,
        [join(here, 'bench.mjs'), bundle, branch, scenario, msArg],
        { encoding: 'utf8' },
      );
      const { ops } = JSON.parse(output);
      appendFileSync(
        outFile,
        `${JSON.stringify({ branch, run, build, scenario, ops })}\n`,
      );
    }
  }
  console.log(`${branch}: run ${run} done`);
}
