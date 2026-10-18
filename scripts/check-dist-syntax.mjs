// Fails when dist uses syntax that the README's supported browsers can't
// parse: Chrome and Edge 85, Firefox 77, Safari 13.1 and iOS 13.4 (README,
// "Supported environments"). The `target` in tsdown.config.ts names the same
// browsers, and the three must agree. The target lowers most newer syntax.
// This catches what it leaves, such as BigInt literals, and the regex syntax
// it turns into RegExp calls, which parse but throw when they run.
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

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const files = readdirSync(distDir).filter((name) => /\.c?js$/.test(name));

const problems = [];
for (const name of files) {
  const code = readFileSync(join(distDir, name), 'utf8');
  for (const [pattern, feature] of unsupported) {
    for (const match of code.matchAll(pattern)) {
      const lines = code.slice(0, match.index).split('\n');
      const column = (lines.at(-1)?.length ?? 0) + 1;
      problems.push(
        `dist/${name}:${lines.length}:${column} ${feature} \`${match[0]}\``,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(
    `These use syntax the README's supported browsers can't parse:\n${problems.map((line) => `- ${line}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `${files.length} files use only syntax the README's supported browsers parse.`,
);
