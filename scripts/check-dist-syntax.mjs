// Fails when the built files use syntax that the README's supported browsers
// (Chrome and Edge 85, Firefox 77, Safari 13.1) can't parse. The build target
// in tsdown.config.ts downlevels most of it; this catches what slips through.
// The target turns regex syntax those browsers lack into a RegExp call, which
// parses but throws when it runs, so those calls count too. Top-level await
// isn't checked: the CJS build already fails on it.
//
// It tokenizes rather than parses, so tokens inside strings, comments and
// regexes don't count. A parse at the browsers' syntax level needs a new dev
// dependency (#783).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{
 *   type: 'name' | 'number' | 'punct' | 'string' | 'template' | 'regex',
 *   value: string,
 *   start: number,
 *   end: number,
 *   slashStartsRegex?: boolean,
 *   unterminated?: boolean,
 * }} Token
 * @typedef {{ start: number, feature: string }} Finding
 * @typedef {{
 *   opener: string,
 *   classBody: boolean,
 *   member: 'key' | 'initializer',
 *   key: string[],
 * }} Scope
 */

const punctuators = [
  '>>>=',
  '...',
  '===',
  '!==',
  '**=',
  '<<=',
  '>>=',
  '>>>',
  '&&=',
  '||=',
  '??=',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '??',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '**',
  '<<',
  '>>',
];
const logicalAssignments = new Set(['||=', '&&=', '??=']);
// After these names, a slash starts a regex rather than a division.
const keywordsBeforeExpression = new Set([
  'await',
  'case',
  'default',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);
// A slash after the `)` that closes these conditions starts a regex.
const conditionKeywords = new Set(['for', 'if', 'while', 'with']);
const supportedRegexFlags = new Set(['g', 'i', 'm', 'u', 'y']);
const newerRegexEscapes = ['\\p{', '\\P{', '\\k<'];

/**
 * Whether a slash after `previous` starts a regex. A `)` or `}` decides by
 * what it closes: a condition or a block means a regex.
 * @param {Token | undefined} previous
 */
function startsRegex(previous) {
  if (!previous) return true;
  if (previous.slashStartsRegex !== undefined) return previous.slashStartsRegex;
  if (previous.type === 'name') {
    return keywordsBeforeExpression.has(previous.value);
  }
  return (
    previous.type === 'punct' &&
    ![')', ']', '}', '++', '--'].includes(previous.value)
  );
}

/**
 * Whether a `{` after `previous` opens a block rather than an object literal.
 * @param {Token | undefined} previous
 */
function opensBlock(previous) {
  if (!previous) return true;
  if (previous.type === 'name') {
    return !keywordsBeforeExpression.has(previous.value);
  }
  return (
    previous.type === 'punct' &&
    [')', ';', '{', '}', '=>'].includes(previous.value)
  );
}

/**
 * Returns the index after the string or regex body that starts at `start`,
 * which ends at an unescaped `close` outside a character class, or -1 if the
 * code ends first.
 * @param {string} code
 * @param {number} start
 * @param {string} close
 */
function quotedEnd(code, start, close) {
  let inClass = false;
  for (let i = start + 1; i < code.length; i += 1) {
    const char = code[i];
    if (char === '\\') i += 1;
    else if (close === '/' && char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (!inClass && char === close) return i + 1;
  }
  return -1;
}

/**
 * Returns the index after the whitespace or comment at `start`, or `start`.
 * @param {string} code
 * @param {number} start
 */
function triviaEnd(code, start) {
  if (/\s/.test(code[start] ?? '')) return start + 1;
  const hashbang = start === 0 && code.startsWith('#!');
  if (hashbang || code.startsWith('//', start)) {
    const lineEnd = code.indexOf('\n', start);
    return lineEnd === -1 ? code.length : lineEnd;
  }
  if (code.startsWith('/*', start)) {
    const blockEnd = code.indexOf('*/', start + 2);
    return blockEnd === -1 ? code.length : blockEnd + 2;
  }
  return start;
}

/**
 * Reads the template text from `start`, just after a backtick or after the
 * brace that closes a substitution, up to the closing backtick or the next
 * substitution. Returns a `${` token after the text when a substitution
 * follows.
 * @param {string} code
 * @param {number} start
 * @param {string[]} brackets open brackets, innermost last
 * @returns {Token[]}
 */
function readTemplate(code, start, brackets) {
  for (let i = start; i < code.length; i += 1) {
    if (code[i] === '\\') {
      i += 1;
    } else if (code[i] === '`') {
      const value = code.slice(start, i);
      return [{ type: 'template', value, start, end: i + 1 }];
    } else if (code.startsWith('${', i)) {
      brackets.push('${');
      const value = code.slice(start, i);
      return [
        { type: 'template', value, start, end: i },
        { type: 'punct', value: '${', start: i, end: i + 2 },
      ];
    }
  }
  const value = code.slice(start);
  const end = code.length;
  return [{ type: 'template', value, start, end, unterminated: true }];
}

/**
 * Tracks the bracket `token` opens or closes, and on a closing bracket
 * records whether a slash after it starts a regex.
 * @param {Token} token
 * @param {Token | undefined} previous
 * @param {string[]} brackets open brackets, innermost last
 */
function trackBracket(token, previous, brackets) {
  if (token.value === '{') {
    brackets.push(opensBlock(previous) ? 'block' : 'object');
  } else if (token.value === '(') {
    const condition =
      previous?.type === 'name' && conditionKeywords.has(previous.value);
    brackets.push(condition ? 'condition' : 'group');
  } else if (token.value === '}' || token.value === ')') {
    const closed = brackets.pop() ?? '';
    token.slashStartsRegex = ['block', 'condition'].includes(closed);
  }
}

/**
 * @param {string} code
 * @param {number} start
 * @param {Token | undefined} previous
 * @param {string[]} brackets open brackets, innermost last
 * @returns {Token}
 */
function readPunctuator(code, start, previous, brackets) {
  const rest = code.slice(start);
  // In `a?.5:1`, the `?` is a conditional on a decimal.
  const optionalChain = /^\?\.(?!\d)/.test(rest) ? '?.' : undefined;
  const value =
    optionalChain ?? punctuators.find((p) => rest.startsWith(p)) ?? rest[0];
  const text = value ?? '';
  /** @type {Token} */
  const token = { type: 'punct', value: text, start, end: start + text.length };
  trackBracket(token, previous, brackets);
  return token;
}

/**
 * @param {string} code
 * @param {number} start
 * @param {Token | undefined} previous
 * @param {string[]} brackets open brackets, innermost last
 * @returns {Token}
 */
function readWord(code, start, previous, brackets) {
  const rest = code.slice(start);
  const name = /^#?[\p{ID_Start}$_][\p{ID_Continue}$]*/u.exec(rest)?.[0];
  if (name)
    return { type: 'name', value: name, start, end: start + name.length };
  const number = /^\.?\d[\w.]*/.exec(rest)?.[0];
  if (number) {
    return { type: 'number', value: number, start, end: start + number.length };
  }
  return readPunctuator(code, start, previous, brackets);
}

/**
 * Reads the string or regex that starts at `start`.
 * @param {string} code
 * @param {number} start
 * @param {'string' | 'regex'} type
 * @returns {Token}
 */
function readQuoted(code, start, type) {
  const close = type === 'regex' ? '/' : (code[start] ?? '');
  const quoteEnd = quotedEnd(code, start, close);
  if (quoteEnd === -1) {
    const value = code.slice(start);
    return { type, value, start, end: code.length, unterminated: true };
  }
  if (type === 'string') {
    const value = code.slice(start + 1, quoteEnd - 1);
    return { type, value, start, end: quoteEnd };
  }
  const flags = /^\w*/.exec(code.slice(quoteEnd))?.[0] ?? '';
  const end = quoteEnd + flags.length;
  return { type, value: code.slice(start, end), start, end };
}

/**
 * Reads the token, or a template's text and `${`, that starts at `start`.
 * @param {string} code
 * @param {number} start
 * @param {Token | undefined} previous
 * @param {string[]} brackets open brackets, innermost last
 * @returns {Token[]}
 */
function readTokens(code, start, previous, brackets) {
  const char = code[start];
  if (char === '`') return readTemplate(code, start + 1, brackets);
  if (char === '}' && brackets.at(-1) === '${') {
    brackets.pop();
    const close = { type: 'punct', value: '}', start, end: start + 1 };
    return [
      /** @type {Token} */ (close),
      ...readTemplate(code, start + 1, brackets),
    ];
  }
  if (char === '"' || char === "'") return [readQuoted(code, start, 'string')];
  if (char === '/' && startsRegex(previous)) {
    return [readQuoted(code, start, 'regex')];
  }
  return [readWord(code, start, previous, brackets)];
}

/**
 * @param {string} code
 */
function tokenize(code) {
  /** @type {Token[]} */
  const tokens = [];
  /** @type {string[]} */
  const brackets = [];
  let i = 0;
  while (i < code.length) {
    const afterTrivia = triviaEnd(code, i);
    if (afterTrivia > i) {
      i = afterTrivia;
    } else {
      const read = readTokens(code, i, tokens.at(-1), brackets);
      tokens.push(...read);
      i = read.at(-1)?.end ?? code.length;
    }
  }
  return tokens;
}

/**
 * Returns the feature of the group that opens at `index` in a regex pattern,
 * if the README's browsers lack it.
 * @param {string} pattern
 * @param {number} index
 */
function groupFeature(pattern, index) {
  if (!pattern.startsWith('(?', index)) return undefined;
  const next = pattern[index + 2] ?? '';
  if (next === '<') return 'regex `(?<` (named group or lookbehind)';
  return /[a-z-]/.test(next) ? 'regex modifiers' : undefined;
}

/**
 * Returns the first regex feature in `pattern` that the README's browsers
 * lack.
 * @param {string} pattern
 */
function patternFeature(pattern) {
  let inClass = false;
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const escape = pattern.slice(i, i + 3);
    if (newerRegexEscapes.includes(escape)) {
      return `regex escape \`${escape}\``;
    }
    if (char === '\\') i += 1;
    else if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (!inClass && groupFeature(pattern, i)) {
      return groupFeature(pattern, i);
    }
  }
  return undefined;
}

/**
 * Returns the first regex feature in `pattern` or `flags` that the README's
 * browsers lack.
 * @param {string} pattern
 * @param {string} flags
 */
function regexFeature(pattern, flags) {
  const flag = flags.split('').find((f) => !supportedRegexFlags.has(f));
  return flag ? `regex flag ${flag}` : patternFeature(pattern);
}

/**
 * Returns the text of a string, or of a template up to its first
 * substitution, with escapes resolved as far as regex syntax needs.
 * @param {Token | undefined} token
 */
function literalText(token) {
  const literal = token?.type === 'string' || token?.type === 'template';
  return literal ? token.value.replace(/\\(.)/gs, '$1') : undefined;
}

/**
 * Returns the regex feature of a `RegExp(pattern, flags)` call whose
 * arguments are literals, starting at the `RegExp` token at `index`.
 * @param {Token[]} tokens
 * @param {number} index
 */
function regexCallFeature(tokens, index) {
  const [open, pattern, comma, flags] = tokens.slice(index + 1, index + 5);
  const source = literalText(pattern);
  if (open?.value !== '(' || source === undefined) return undefined;
  const flagSource = comma?.value === ',' ? literalText(flags) : undefined;
  return regexFeature(source, flagSource ?? '');
}

/**
 * Returns the feature of a name at `index`: a private member, or a RegExp
 * call with newer regex syntax.
 * @param {Token} token
 * @param {Token[]} tokens
 * @param {number} index
 */
function nameFeature(token, tokens, index) {
  if (token.value.startsWith('#')) {
    return `private class member \`${token.value}\``;
  }
  return token.value === 'RegExp' ? regexCallFeature(tokens, index) : undefined;
}

/**
 * The feature each kind of token can have that the README's browsers lack,
 * apart from class fields.
 * @type {Partial<Record<Token['type'], (token: Token, tokens: Token[], index: number) => string | undefined>>}
 */
const featureByType = {
  regex({ value }) {
    const close = value.lastIndexOf('/');
    return regexFeature(value.slice(1, close), value.slice(close + 1));
  },
  number: ({ value }) => (value.endsWith('n') ? 'BigInt literal' : undefined),
  punct({ value }) {
    if (logicalAssignments.has(value)) return `logical assignment \`${value}\``;
    return value === '@' ? 'decorator' : undefined;
  },
  name: nameFeature,
};

/**
 * @param {Token[]} tokens
 * @param {number} index
 */
function tokenFeature(tokens, index) {
  const token = tokens[index];
  if (!token) return undefined;
  if (token.unterminated) {
    return `unterminated ${token.type}, so the rest of the file went unchecked`;
  }
  return featureByType[token.type]?.(token, tokens, index);
}

/**
 * Whether the `class` name at `index` is the keyword, not a property name.
 * @param {Token[]} tokens
 * @param {number} index
 */
function isClassKeyword(tokens, index) {
  const token = tokens[index];
  if (token?.type !== 'name' || token.value !== 'class') return false;
  const before = tokens[index - 1]?.value ?? '';
  const after = tokens[index + 1]?.value ?? '';
  return !['.', '?.'].includes(before) && ![':', '('].includes(after);
}

/** @param {Scope} body */
function resetMember(body) {
  body.member = 'key';
  body.key = [];
}

/**
 * Ends the current member of a class body, and returns 'class field' if it
 * was one without an initializer.
 * @param {Scope} body
 */
function endMember(body) {
  const field = body.member === 'key' && body.key.length > 0;
  resetMember(body);
  return field ? 'class field' : undefined;
}

/**
 * Reads the token at a class body's own level, and returns the feature it
 * completes: a field or a static block.
 * @param {Scope} body
 * @param {Token} token
 */
function memberFeature(body, token) {
  const value = token.type === 'punct' ? token.value : '';
  if (value === ';' || value === '}') return endMember(body);
  if (body.member !== 'key') return undefined;
  if (value === '=') {
    body.member = 'initializer';
    return 'class field';
  }
  // Any other brace here opens a method body.
  if (value === '{') {
    return body.key.join(' ') === 'static' ? 'class static block' : undefined;
  }
  body.key.push(token.value);
  return undefined;
}

/**
 * Opens or closes the scope `token` starts or ends, and returns the depth of
 * the `class` keyword whose body is still to open, or -1.
 * @param {Scope[]} scopes
 * @param {Token} token
 * @param {number} classDepth
 */
function updateScopes(scopes, token, classDepth) {
  if (token.type !== 'punct') return classDepth;
  if (['(', '[', '{', '${'].includes(token.value)) {
    const classBody = token.value === '{' && classDepth === scopes.length;
    scopes.push({ opener: token.value, classBody, member: 'key', key: [] });
    return classBody ? -1 : classDepth;
  }
  if ([')', ']', '}'].includes(token.value)) {
    const closed = scopes.pop();
    const body = scopes.at(-1);
    // A method body or static block closed, so the next member starts.
    if (body?.classBody && closed?.opener === '{') resetMember(body);
  }
  return classDepth;
}

/**
 * Finds class fields and static blocks.
 * @param {Token[]} tokens
 */
function classFeatures(tokens) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Scope[]} */
  const scopes = [];
  let classDepth = -1;
  tokens.forEach((token, index) => {
    if (isClassKeyword(tokens, index)) classDepth = scopes.length;
    const top = scopes.at(-1);
    const feature = top?.classBody ? memberFeature(top, token) : undefined;
    if (feature) findings.push({ start: token.start, feature });
    classDepth = updateScopes(scopes, token, classDepth);
  });
  return findings;
}

/**
 * @param {string} code
 * @returns {Finding[]}
 */
function findUnsupported(code) {
  const tokens = tokenize(code);
  /** @type {Finding[]} */
  const findings = classFeatures(tokens);
  tokens.forEach((token, index) => {
    const feature = tokenFeature(tokens, index);
    if (feature) findings.push({ start: token.start, feature });
  });
  return findings.toSorted((a, b) => a.start - b.start);
}

/**
 * @param {string} code
 * @param {number} offset
 */
function lineAndColumn(code, offset) {
  const lines = code.slice(0, offset).split('\n');
  return `${lines.length}:${(lines.at(-1)?.length ?? 0) + 1}`;
}

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const files = process.argv.slice(2);
if (files.length === 0) {
  for (const name of readdirSync(distDir)) {
    if (/\.c?js$/.test(name)) files.push(join(distDir, name));
  }
}

const problems = [];
for (const file of files) {
  const code = readFileSync(file, 'utf8');
  for (const { start, feature } of findUnsupported(code)) {
    problems.push(`${file}:${lineAndColumn(code, start)} ${feature}`);
  }
}

if (problems.length > 0) {
  console.error(
    `These use syntax the README's supported browsers can't run:\n${problems.map((line) => `- ${line}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `${files.length} files use only syntax the README's supported browsers run.`,
);
