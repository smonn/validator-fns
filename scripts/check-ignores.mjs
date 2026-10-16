// Fails when a path-based ignore in a check's config matches no tracked file.
// Renaming an ignored file otherwise voids its ignore without any tool
// noticing, as happened to runkit.js in #549. Each ignore's reason is a
// comment next to it in its config.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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

let count = 0;
const unmatched = [];
for (const { configFile, key } of ignoreLists) {
  // The configs allow comments, which JSON.parse rejects.
  const { config, error } = ts.parseConfigFileTextToJson(
    configFile,
    readFileSync(join(packageRoot, configFile), 'utf8'),
  );
  if (error) {
    throw new Error(
      `Could not parse ${configFile}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`,
    );
  }
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
