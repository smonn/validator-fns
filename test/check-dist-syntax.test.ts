import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert, test } from 'vitest';

const repoRoot = path.join(import.meta.dirname, '..');
const script = path.join(repoRoot, 'scripts/check-dist-syntax.mjs');
const tsdown = path.join(repoRoot, 'node_modules/tsdown/dist/run.mjs');

/** A README whose polyfill list names each of `apis`. */
function readmeListing(...apis: string[]) {
  return [
    '## Supported environments',
    '',
    'To support older environments, transpile or polyfill these:',
    '',
    ...apis.map((api) => `- \`${api}\``),
    '- `Promise`, `URL`, and the rest of ES2015',
    '',
  ].join('\n');
}

/**
 * Runs a copy of the script next to a dist folder holding `files` and a
 * README, so it scans them the way it scans the real dist.
 */
function run(files: Record<string, string>, readme = readmeListing()) {
  const root = mkdtempSync(path.join(tmpdir(), 'dist-syntax-'));
  mkdirSync(path.join(root, 'scripts'));
  mkdirSync(path.join(root, 'dist'));
  const copy = path.join(root, 'scripts', path.basename(script));
  copyFileSync(script, copy);
  writeFileSync(path.join(root, 'README.md'), readme);
  for (const [name, code] of Object.entries(files)) {
    writeFileSync(path.join(root, 'dist', name), code);
  }
  // A timeout, so a regex that backtracks fails the test instead of hanging.
  return spawnSync(process.execPath, [copy], {
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test.each([
  ['logical assignment', 'a=a||b;', 'a||=b;'],
  ['logical assignment', 'a=a&&b;', 'a&&=b;'],
  ['logical assignment', 'a=a??b;', 'a??=b;'],
  [
    'private class member',
    'let a=/[\\w!#$%]/;',
    'class A{#a;b(){return this.#a}}',
  ],
  ['class static block', 'class A{static a(){}}', 'class A{static{}}'],
  ['class field', 'class A{a(){return{b:1}}}', 'class A{a=1}'],
  ['class field', 'class A{static a(){}}', 'class A{static a=1}'],
  ['class field', 'a={class:b},c={d};e.class;f={g};', 'class A{a=1}'],
  [
    'regex named group or lookbehind',
    'let a=/(?:a)(?=b)(?!c)/;',
    'let a=/(?<y>a)/;',
  ],
  ['regex named group or lookbehind', 'let a=/a(?=b)/;', 'let a=/(?<=a)b/;'],
  ['regex modifiers', 'let a=/(?:a)/i;', 'let a=/(?i:a)b/;'],
  ['regex modifiers', 'let a=/(?:a)/i;', 'let a=/(?-i:a)/i;'],
  [
    'regex property escape or named backreference',
    'let a=/\\d\\w/u;',
    'let a=/\\p{L}/u;',
  ],
  [
    'regex property escape or named backreference',
    'let a=/(a)\\1/;',
    'let a=RegExp(`(?<y>a)\\\\k<y>`);',
  ],
  ['regex flag d, s or v', 'let a=RegExp(b,`gu`);', 'let a=RegExp(`a.b`,`s`);'],
  [
    'regex flag d, s or v',
    "let a=RegExp('a,b','g');",
    "let a=RegExp('a,b','s');",
  ],
  [
    'regex flag d, s or v',
    'let a=RegExp("a(b).");',
    'let a=RegExp("a(b).","s");',
  ],
  [
    'regex flag d, s or v',
    'let a=RegExp(`a\\`,b`,`u`);',
    'let a=RegExp(`a\\`,b`,`d`);',
  ],
  ['BigInt literal', 'let a1n=10,b=0x1f;', 'let a=10n;'],
  ['BigInt literal', 'let a=0x1f;', 'let a=0x1fn;'],
])('flags %s: passes %s, fails %s', (feature, passing, failing) => {
  const passed = run({ 'index.js': passing });
  assert.strictEqual(passed.status, 0, passed.stderr);
  const failed = run({ 'index.js': failing });
  assert.strictEqual(failed.status, 1);
  assert.include(failed.stderr, feature);
});

test('scans the .js and .cjs files in dist, and nothing else', () => {
  const result = run({
    'index.js': 'a||=b;',
    'index.cjs': 'c&&=d;',
    'index.d.ts': 'e??=f;',
  });
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, 'index.js:1:2 logical assignment');
  assert.include(result.stderr, 'index.cjs:1:2 logical assignment');
  assert.notInclude(result.stderr, 'index.d.ts');
});

test('names the line and column', () => {
  const result = run({ 'index.js': 'let a;\nb||=c;' });
  assert.include(result.stderr, 'index.js:2:2 logical assignment `||=`');
});

test('finds syntax after a regex that follows a block', () => {
  // A tokenizer that reads this `/` as a division would read the `'` as the
  // start of a string and miss everything after it.
  const result = run({ 'index.js': "function f(){}/'/.test(a);b||=c;d='e';" });
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, 'logical assignment');
});

test.each(['/a,b/s', '/a(b)./s'])(
  'finds the flags of %s in the build output',
  (regex) => {
    // Builds with tsdown.config.ts, so its target turns the regex into a
    // RegExp call.
    const root = mkdtempSync(path.join(tmpdir(), 'dist-syntax-build-'));
    const entry = path.join(root, 'entry.ts');
    const outDir = path.join(root, 'out');
    writeFileSync(entry, `export const pattern = ${regex};\n`);
    const built = spawnSync(
      process.execPath,
      [tsdown, entry, '-d', outDir, '--no-dts', '--no-sourcemap'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.strictEqual(built.status, 0, built.stderr);
    const esm = readFileSync(path.join(outDir, 'entry.js'), 'utf8');
    assert.include(esm, 'RegExp(');
    const result = run({
      'index.js': esm,
      'index.cjs': readFileSync(path.join(outDir, 'entry.cjs'), 'utf8'),
    });
    assert.strictEqual(result.status, 1);
    assert.include(result.stderr, 'index.js:1:');
    assert.include(result.stderr, 'index.cjs:1:');
    assert.include(result.stderr, 'regex flag d, s or v');
  },
);

test.each([
  [['BigInt'], 'let a=BigInt(b);'],
  [['BigInt'], 'let a=BigInt.asIntN(64,b);'],
  [['WeakRef'], 'let a=new WeakRef(b);'],
  [['FinalizationRegistry'], 'let a=new FinalizationRegistry(b);'],
  [['AggregateError'], 'let a=b instanceof AggregateError;'],
  [['structuredClone'], 'let a=structuredClone(b);'],
  [['structuredClone'], 'let a=globalThis.structuredClone(b);'],
  [['Object.hasOwn'], 'let a=Object.hasOwn(b,c);'],
  [['Object.hasOwn'], 'let a=Object.hasOwn.call(void 0,b,c);'],
  [['Promise.any'], 'let a=Promise.any(b);'],
  [['Intl.ListFormat'], 'let a=new Intl.ListFormat(`en`);'],
  [['URL.canParse'], 'let a=URL.canParse(b);'],
  [['Array.prototype.at', 'String.prototype.at'], 'let a=b.at(-1);'],
  [
    ['Array.prototype.at', 'String.prototype.at'],
    'let a=Array.prototype.at.call(b,-1);',
  ],
  [['Array.prototype.at', 'String.prototype.at'], 'let a=b.at?.(-1);'],
  [
    ['Array.prototype.at', 'String.prototype.at'],
    'let a=(t=b.at)==null?void 0:t.call(b,-1);',
  ],
  [['Array.prototype.findLast'], 'let a=b.findLast(c);'],
  [['Array.prototype.findLastIndex'], 'let a=b.findLastIndex(c);'],
  [['String.prototype.replaceAll'], 'let a=b.replaceAll(c,d);'],
  [['Error.cause'], 'throw new Error(`a`,{cause:b});'],
  [['Error.cause'], 'throw TypeError(`a${String(b)}`,{cause:b});'],
  [
    ['Error.cause'],
    'throw Error(`a${b.map((c)=>JSON.stringify(c))}`,{cause:b});',
  ],
  [['Error.cause'], 'throw Error(a,{b:{c:1},cause:d});'],
  [
    ['Error.cause'],
    'class A extends Error{constructor(a,b){super(a,{cause:b})}}',
  ],
])('flags %j: fails unless the README lists it', (apis, code) => {
  const unlisted = run({ 'index.js': code });
  assert.strictEqual(unlisted.status, 1);
  for (const api of apis) {
    assert.include(unlisted.stderr, api);
  }
  const listed = run({ 'index.js': code }, readmeListing(...apis));
  assert.strictEqual(listed.status, 0, listed.stderr);
});

test('needs every API a method name could be', () => {
  const result = run(
    { 'index.js': 'let a=b.at(-1);' },
    readmeListing('Array.prototype.at'),
  );
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, 'String.prototype.at');
});

test.each([
  ['an identifier in a string', 'let a=`Expected a BigInt or WeakRef`;'],
  ['an identifier in a string', 'let a="Use Object.hasOwn, at least";'],
  ['an identifier in a string', "let a='a cause of failure';"],
  ['a longer name', 'let a=b.atom(c)+b.attach(c)+b.withdraw(c);'],
  ['a property of the same name', 'let a=b.BigInt(c)+b.structuredClone(c);'],
  [
    'a method of another object',
    'let a=b.hasOwn(c)+Reflect.any(c)+myObject.hasOwn(c);',
  ],
  ['a property named cause', 'let a={cause:b};'],
  ['a cause passed to another call', 'let a=f(`a`,{cause:b});'],
  ['an Error option named like cause', 'throw Error(`a`,{causes:b});'],
  ['a function named like an Error', 'let a=formatError(b,{cause:c});'],
])('passes %s', (_, code) => {
  const result = run({ 'index.js': code });
  assert.strictEqual(result.status, 0, result.stderr);
});

test('fails on code quoted in a string', () => {
  const result = run({ 'index.js': 'let a=`Call b.at(-1)`;' });
  assert.strictEqual(result.status, 1);
});

test('scans unclosed Error options in linear time', () => {
  const started = performance.now();
  const result = run({ 'index.js': `Error(a${',{'.repeat(1e6)}` });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.isBelow(performance.now() - started, 5000);
});

test('names the API, line and column', () => {
  const result = run({ 'index.js': 'let a;\nlet b=Object.hasOwn(c,d);' });
  assert.include(result.stderr, 'index.js:2:7 `Object.hasOwn`');
});

test('counts only the polyfill list', () => {
  const readme = `${readmeListing()}\n## API\n\nUses \`Object.hasOwn\`.\n`;
  const result = run({ 'index.js': 'let a=Object.hasOwn(b,c);' }, readme);
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, 'Object.hasOwn');
});

test('fails when the README has no polyfill list', () => {
  const result = run({ 'index.js': 'let a=1;' }, '# validator-fns\n');
  assert.strictEqual(result.status, 1);
  assert.include(result.stderr, 'polyfill list');
});

test("passes the README's own polyfill list", () => {
  const result = run(
    { 'index.js': 'let a=b.replaceAll(c,d);' },
    readFileSync(path.join(repoRoot, 'README.md'), 'utf8'),
  );
  assert.strictEqual(result.status, 0, result.stderr);
});
