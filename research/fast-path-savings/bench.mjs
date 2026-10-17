// Usage: node bench.mjs <bundle index.js> <main|next> <scenario> [measure ms]
// Runs one scenario in a fresh process: warm-up, then counts calls in a fixed
// time and prints {"ops": <calls per second>} as JSON.
import { pathToFileURL } from 'node:url';
import { scenarios } from './scenarios.mjs';

const [bundle, branch, name, measureArg] = process.argv.slice(2);
const measureMs = Number(measureArg ?? 1000);
const warmupMs = 300;

const V = await import(pathToFileURL(bundle).href);
const scenario = scenarios(branch, V)[name];
if (!scenario) throw new Error(`Unknown scenario: ${name}`);

let sink = 0;
let i = 0;

async function batch(size) {
  if (scenario.kind === 'sync') {
    for (let n = 0; n < size; n++) {
      if (scenario.run(i++) === sink) sink++;
    }
  } else {
    for (let n = 0; n < size; n++) {
      if ((await scenario.run(i++)) === sink) sink++;
    }
  }
}

const size = scenario.kind === 'sync' ? 10_000 : 500;

async function runFor(ms) {
  let calls = 0;
  const start = performance.now();
  let elapsed = 0;
  while (elapsed < ms) {
    await batch(size);
    calls += size;
    elapsed = performance.now() - start;
  }
  return (calls / elapsed) * 1000;
}

await runFor(warmupMs);
const ops = await runFor(measureMs);
console.log(JSON.stringify({ ops, sink }));
