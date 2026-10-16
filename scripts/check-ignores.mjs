// Fails when a path-based ignore in a check's config matches no tracked file.
// Renaming an ignored file otherwise voids its ignore without any tool
// noticing, as happened to runkit.js in #549. Each ignore's reason is a
// comment next to it in its config.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

/** Each config file, and the key that holds its path ignores. */
const ignoreLists = [
  { configFile: '.oxfmtrc.json', key: 'ignorePatterns' },
  { configFile: '.oxlintrc.json', key: 'ignorePatterns' },
  { configFile: '.rev-dep.config.jsonc', key: 'ignoreFiles' },
];

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: packageRoot,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);

/**
 * @param {string} pattern
 */
function matchesTrackedFile(pattern) {
  // oxfmt and oxlint read ignores the way .gitignore does, where a pattern
  // without a slash matches at any depth.
  return trackedFiles.some(
    (file) => matchesGlob(file, pattern) || matchesGlob(file, `**/${pattern}`),
  );
}

/**
 * Returns where a comment starting at `start` ends, or `start` if none starts
 * there.
 * @param {string} text
 * @param {number} start
 */
function commentEnd(text, start) {
  if (text.startsWith('//', start)) {
    const lineEnd = text.indexOf('\n', start);
    return lineEnd === -1 ? text.length : lineEnd;
  }
  if (text.startsWith('/*', start)) {
    const blockEnd = text.indexOf('*/', start + 2);
    return blockEnd === -1 ? text.length : blockEnd + 2;
  }
  return start;
}

/**
 * Parses JSON with comments and trailing commas, as the configs allow. Copies
 * strings as they are, so a `//` or `,}` inside one, as in a URL or glob,
 * stays.
 * @param {string} text
 */
function parseJsonc(text) {
  const stringPattern = /"(?:[^"\\]|\\.)*"/y;
  let json = '';
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const afterComment = commentEnd(text, i);
    if (char === '"') {
      stringPattern.lastIndex = i;
      const string = stringPattern.exec(text)?.[0] ?? text.slice(i);
      json += string;
      i += string.length;
    } else if (afterComment > i) {
      i = afterComment;
    } else {
      if (char === ']' || char === '}') {
        // A comma that is the last thing before a closing bracket is a
        // trailing comma. Strings are copied whole, so it isn't inside one.
        json = json.replace(/,\s*$/, '');
      }
      json += char;
      i += 1;
    }
  }
  return JSON.parse(json);
}

let count = 0;
const unmatched = [];
for (const { configFile, key } of ignoreLists) {
  const config = parseJsonc(
    readFileSync(join(packageRoot, configFile), 'utf8'),
  );
  /** @type {string[]} */
  const patterns = config[key] ?? [];
  for (const pattern of patterns) {
    count += 1;
    if (!matchesTrackedFile(pattern)) {
      unmatched.push(`${configFile} ${key}: ${pattern}`);
    }
  }
}

if (unmatched.length > 0) {
  console.error(
    `These ignores match no tracked file. Update or remove them:\n${unmatched.map((line) => `- ${line}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(`All ${count} path ignores match a tracked file.`);
