// Fails when dist uses syntax that the README's supported browsers can't
// parse: Chrome and Edge 85, Firefox 77, Safari 13.1 and iOS 13.4 (README,
// "Supported environments"). The `target` in tsdown.config.ts names the same
// browsers, and the three must agree. The target lowers most newer syntax.
// This catches what it leaves, such as BigInt literals, and the regex syntax
// it turns into RegExp calls, which parse but throw when they run. It also
// fails on an API from those versions or later that the README's polyfill
// list doesn't name, as the target lowers syntax only.
//
// It scans text rather than parsing, so a match inside a string or a comment
// fails too, as does `(?<` inside a regex character class (`/[(?<]/`), which
// those browsers accept. A parse at their syntax level needs a new dev
// dependency (#783).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {[RegExp, string][]} */
const unsupported = [
  [/\|\|=|&&=|\?\?=/g, 'logical assignment'],
  [/#[A-Za-z_][\w$]*/g, 'private class member'],
  [/\bstatic\s*\{/g, 'class static block'],
  // Only a class's first member, or one after `static`, is matched.
  [
    /(?<![.\w$])class\b(?!\s*:)[^{]*\{\s*(?:static\s+)?[\w$]+\s*[=;}]/g,
    'class field',
  ],
  [/\(\?</g, 'regex named group or lookbehind'],
  [/\(\?[a-z-]+:/g, 'regex modifiers'],
  [/\\{1,2}(?:[pP]\{|k<)/g, 'regex property escape or named backreference'],
  // The pattern is a quoted string, which can hold commas and parentheses,
  // or a plain expression.
  [
    /\bRegExp\(\s*(?:`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,)"'`]*)\s*,\s*["'`][a-z]*[dsv]/gs,
    'regex flag d, s or v',
  ],
  [/\b(?:0[box][\da-f_]+|\d[\d_]*)n\b/gi, 'BigInt literal'],
];

// APIs from the README's versions or later. Each comment gives the first
// Chrome, Firefox and Safari versions, per MDN's browser compatibility data
// 8.1.6. `replaceAll` is the newest API the README lists, so it sets those
// versions. A method name that several APIs share needs them all listed, as
// the receiver isn't known, and this library's own `.with(`, `.union(` or
// `.difference(` would fail too.
//
// Only calls, `new`, `instanceof` and member access match, so a name in a
// message doesn't. Code quoted in a string, such as 'Object.hasOwn(', still
// fails, and so does a call behind a feature check, or a `cause` key soon
// after an Error call ends (`throw Error(a);f({cause:b})`). Error options
// passed in a variable, aliases and computed members aren't seen.
const globalObject = 'globalThis|self|window';
const notMember = String.raw`(?<![\w$])(?<!(?<!\b(?:${globalObject}))\.)`;
const qualifier = String.raw`(?:(?:${globalObject})\.)?`;
// The minifier drops a constructor's empty parentheses: `new Intl.Segmenter`.
const constructed = String.raw`\bnew\s+${qualifier}`;
// `)` covers the target's lowering of `a.at?.(1)` to `(t=a.at)==null?...`.
const called = String.raw`(?:\s*(?:\?\.\s*)?\(|\.(?:call|apply|bind)\b|\))`;

/** @param {string} name @returns {Api} */
function matchGlobal(name) {
  const pattern = String.raw`${notMember}${name}(?:\s*(?:\?\.\s*)?\(|\.[\w$])|\b(?:new|instanceof)\s+${qualifier}${name}\b`;
  return [new RegExp(pattern, 'g'), [name]];
}
/** @param {string} owner @param {string} name @returns {Api} */
function matchMember(owner, name) {
  const pattern = String.raw`${notMember}${owner}\.${name}${called}|${constructed}${owner}\.${name}\b`;
  return [new RegExp(pattern, 'g'), [`${owner}.${name}`]];
}
/** @param {string[]} owners @param {string} name @returns {Api} */
function matchMethod(owners, name) {
  const pattern = String.raw`\.${name}${called}`;
  const apis = owners.map((owner) => `${owner}.prototype.${name}`);
  return [new RegExp(pattern, 'g'), apis];
}

/** @typedef {[RegExp, string[]]} Api */
/** @type {Api[]} */
const newerApis = [
  matchGlobal('BigInt'), // 67, 68, 14
  matchGlobal('WeakRef'), // 84, 79, 14.1
  matchGlobal('FinalizationRegistry'), // 84, 79, 14.1
  matchGlobal('AggregateError'), // 85, 79, 14
  matchGlobal('structuredClone'), // 98, 94, 15.4
  matchGlobal('DisposableStack'), // 134, 141, preview
  matchMember('Promise', 'any'), // 85, 79, 14
  matchMember('Object', 'hasOwn'), // 93, 92, 15.4
  matchMember('crypto', 'randomUUID'), // 92, 95, 15.4
  matchMember('Intl', 'RelativeTimeFormat'), // 71, 65, 14
  matchMember('Intl', 'Locale'), // 74, 75, 14
  matchMember('Intl', 'ListFormat'), // 72, 78, 14.1
  matchMember('Intl', 'DisplayNames'), // 81, 86, 14.1
  matchMember('Intl', 'Segmenter'), // 87, 125, 14.1
  matchMember('Intl', 'supportedValuesOf'), // 99, 93, 15.4
  matchMember('Intl', 'DurationFormat'), // 129, 136, 16.4
  matchMember('AbortSignal', 'timeout'), // 124, 100, 16
  matchMember('AbortSignal', 'any'), // 116, 124, 17.4
  matchMember('URL', 'canParse'), // 120, 115, 17
  matchMember('URL', 'parse'), // 126, 126, 18
  matchMember('Object', 'groupBy'), // 117, 119, 17.4
  matchMember('Map', 'groupBy'), // 117, 119, 17.4
  matchMember('Promise', 'withResolvers'), // 119, 121, 17.4
  matchMember('Array', 'fromAsync'), // 121, 115, 16.4
  matchMember('Iterator', 'from'), // 122, 131, 18.4
  matchMember('Promise', 'try'), // 128, 134, 18.2
  matchMember('RegExp', 'escape'), // 136, 134, 18.2
  matchMember('Uint8Array', 'fromBase64'), // 140, 133, 18.2
  matchMember('Error', 'captureStackTrace'), // 3, 138, 17.2
  matchMember('Error', 'isError'), // 134, 138, preview
  matchMember('Math', 'sumPrecise'), // 147, 137, 26.2
  matchMethod(['String'], 'replaceAll'), // 85, 77, 13.1
  matchMethod(['Array', 'String'], 'at'), // 92, 90, 15.4
  matchMethod(['Array'], 'findLast'), // 97, 104, 15.4
  matchMethod(['Array'], 'findLastIndex'), // 97, 104, 15.4
  matchMethod(['Array'], 'toSorted'), // 110, 115, 16
  matchMethod(['Array'], 'toReversed'), // 110, 115, 16
  matchMethod(['Array'], 'toSpliced'), // 110, 115, 16
  matchMethod(['Array'], 'with'), // 110, 115, 16
  matchMethod(['String'], 'isWellFormed'), // 111, 119, 16.4
  matchMethod(['String'], 'toWellFormed'), // 111, 119, 16.4
  ...[
    'union',
    'intersection',
    'difference',
    'symmetricDifference',
    'isSubsetOf',
    'isSupersetOf',
    'isDisjointFrom',
  ].map((name) => matchMethod(['Set'], name)), // 122, 127, 17
  matchMethod(['Map', 'WeakMap'], 'getOrInsert'), // 145, 144, 26.2
  matchMethod(['Map', 'WeakMap'], 'getOrInsertComputed'), // 145, 144, 26.2
  [
    // `cause` as a key within 300 characters after a built-in Error's or
    // `super`'s opening parenthesis. The window ignores literals and
    // statements, which a regex can't follow, and its bound keeps the scan
    // linear.
    /(?<![\w$.])(?:(?:Aggregate|Eval|Range|Reference|Syntax|Type|URI)?Error|super)\s*\([\s\S]{0,300}?[{,]\s*cause\s*[:,}]/g,
    ['Error.cause'], // 93, 91, 15
  ],
];

const polyfillIntro =
  'To support older environments, transpile or polyfill these:';
const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const files = readdirSync(distDir).filter((name) => /\.c?js$/.test(name));
const readme = readFileSync(
  fileURLToPath(new URL('../README.md', import.meta.url)),
  'utf8',
);
const polyfillList = new RegExp(
  String.raw`^${polyfillIntro}\r?\n(?:\r?\n)*((?:- .*(?:\r?\n|$))+)`,
  'm',
).exec(readme)?.[1];
if (polyfillList === undefined) {
  console.error(`The README has no polyfill list after "${polyfillIntro}".`);
  process.exit(1);
}

/**
 * Where `index` falls in `code`, as `line:column`.
 * @param {string} code
 * @param {number} index
 */
function locate(code, index) {
  const lines = code.slice(0, index).split('\n');
  return `${lines.length}:${(lines.at(-1)?.length ?? 0) + 1}`;
}

const syntaxProblems = [];
const apiProblems = [];
for (const name of files) {
  const code = readFileSync(join(distDir, name), 'utf8');
  for (const [pattern, feature] of unsupported) {
    for (const match of code.matchAll(pattern)) {
      syntaxProblems.push(
        `dist/${name}:${locate(code, match.index)} ${feature} \`${match[0]}\``,
      );
    }
  }
  for (const [pattern, apis] of newerApis) {
    const unlisted = apis.filter((api) => !polyfillList.includes(`\`${api}\``));
    if (unlisted.length === 0) {
      continue;
    }
    for (const match of code.matchAll(pattern)) {
      apiProblems.push(
        `dist/${name}:${locate(code, match.index)} ${unlisted.map((api) => `\`${api}\``).join(', ')} \`${match[0]}\``,
      );
    }
  }
}

/** @param {string[]} lines */
function formatList(lines) {
  return lines.map((line) => `- ${line}`).join('\n');
}
if (syntaxProblems.length > 0) {
  console.error(
    `These use syntax the README's supported browsers can't parse:\n${formatList(syntaxProblems)}`,
  );
}
if (apiProblems.length > 0) {
  console.error(
    `These use APIs that the README's polyfill list doesn't name:\n${formatList(apiProblems)}`,
  );
}
if (syntaxProblems.length > 0 || apiProblems.length > 0) {
  process.exit(1);
}
console.log(
  `${files.length} files use only syntax the README's supported browsers parse, and only APIs they have or its polyfill list names.`,
);
