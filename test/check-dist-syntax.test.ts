import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert, describe, test } from 'vitest';

const script = path.join(
  import.meta.dirname,
  '../scripts/check-dist-syntax.mjs',
);

function run(code: string) {
  const file = path.join(
    mkdtempSync(path.join(tmpdir(), 'dist-syntax-')),
    'index.js',
  );
  writeFileSync(file, code);
  return spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
}

describe('syntax the README browsers parse', () => {
  test.each([
    ['nullish coalescing and optional chaining', 'let a=b??c?.d;'],
    ['a conditional on a decimal', 'let a=b?.5:1;'],
    ['object spread and optional catch binding', 'try{a={...b}}catch{}'],
    ['async functions', 'async function a(){await b}'],
    ['numeric separators', 'let a=1_000;'],
    [
      'methods and accessors',
      'class A{a(){return{b:1}}get c(){return 1}static d(){}}',
    ],
    ['braces in an extends clause', 'class A extends f({a:1}){m(){}}'],
    ['a property named class', 'a.class=1;b={class:2};'],
    ['older regex flags', 'let a=/a/gimuy;'],
    ['regex group syntax inside a character class', 'let a=/[(?<]/;'],
    ['a division after an object literal', 'let a={b:1}/2;'],
    ['a RegExp built from a variable', 'let a=new RegExp(b);'],
    ['a string after RegExp but not its argument', 'let a=[RegExp,"(?<"];'],
    ['a RegExp built from a plain pattern', 'let a=RegExp(`a+`,`gu`);'],
  ])('passes %s', (_, code) => {
    const result = run(code);
    assert.strictEqual(result.status, 0, result.stderr);
  });
});

describe('syntax newer than the README browsers', () => {
  test.each([
    ['a||=b;', '||='],
    ['a&&=b;', '&&='],
    ['a??=b;', '??='],
    ['class A{#a=1}', 'private class member'],
    ['a=b.#c;', 'private class member'],
    ['class A{a=1}', 'class field'],
    ['class A{a;b(){}}', 'class field'],
    ['class A{b(){}a}', 'class field'],
    ['class A extends B{static a=2}', 'class field'],
    ['class A{static{}}', 'class static block'],
    ['let a=/(?<y>a)/;', '(?<'],
    ['let a=/(?<=a)b/;', '(?<'],
    ['let a=/\\p{L}/u;', '\\p{'],
    ['let a=/a/s;', 'regex flag s'],
    ['let a=/a/d;', 'regex flag d'],
    ['export default/(?<y>a)/;', '(?<'],
    ['let a=/(?i:a)b/;', 'regex modifiers'],
    ['let a=/(?-i:a)/i;', 'regex modifiers'],
    ['let a=10n;', 'BigInt literal'],
    ['let a=@b class{};', 'decorator'],
    ['let a="b;', 'unterminated'],
    ['let a=/b;', 'unterminated'],
    ['let a=`b;', 'unterminated'],
    ['let a=RegExp(`(?<y>\\\\d)`,``);', '(?<'],
    ['let a=new RegExp("a","s");', 'regex flag s'],
  ])('fails %s', (code, feature) => {
    const result = run(code);
    assert.strictEqual(result.status, 1);
    assert.include(result.stderr, feature);
  });

  test('names the file, line and column', () => {
    const result = run('let a;\nb||=c;');
    assert.match(result.stderr, /index\.js:2:2 .*\|\|=/);
  });
});

describe('where the tokens appear', () => {
  test.each([
    ['a string', 'let a="b||=c#d";'],
    ['a template literal', 'let a=`b||=c${d}#e`;'],
    ['a comment', '/* a||=b */ // c&&=d\nlet e;'],
    ['a regex', 'let a=/#a||=b/;'],
    ['a regex after return', 'function f(){return/#a||=b/.test(c)}'],
    ['a regex with a slash in a class', 'let a=/[/]#b||=/;'],
    ['a hashbang', '#!/usr/bin/env node\nlet a;'],
  ])('ignores them inside %s', (_, code) => {
    const result = run(code);
    assert.strictEqual(result.status, 0, result.stderr);
  });

  test.each([
    ['a template substitution', 'let a=`b${c||=d}`;'],
    ['a nested template substitution', 'let a=`b${`c${d??=e}`}`;'],
    ['code after a template with a brace in it', 'let a=`${"}"}`;b&&=c;'],
    ['code after a division', 'let a=b/c;d||=e;'],
    ['code between divisions of a number', 'let a=1/2;b||=c/3;'],
    ['code between divisions of a group', 'let a=(b)/2;c||=d/3;'],
    ['an object in a template substitution', 'let a=`${{b:1}.c||=d}`;'],
    [
      'a regex after a function declaration',
      "function f(){}/'/.test(a);b||=c;d='e';",
    ],
    ['a regex after an if condition', "if(a)/'/.test(b);c||=d;e='f';"],
    ['a regex after a block', "if(a){b()}/'/.test(c);d||=e;f='g';"],
  ])('finds them in %s', (_, code) => {
    const result = run(code);
    assert.strictEqual(result.status, 1);
    assert.include(result.stderr, 'logical assignment');
  });
});
