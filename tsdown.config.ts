import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  // Keeps index.js for ESM, as package.json's exports expect, instead of
  // index.mjs.
  fixedExtension: false,
  // The README's supported environments, which scripts/check-dist-syntax.mjs
  // checks dist against. Without this, tsdown targets engines.node, and both
  // the transform and the minifier emit syntax those browsers can't parse,
  // such as `||=`.
  target: [
    'chrome85',
    'edge85',
    'firefox77',
    'safari13.1',
    'ios13.4',
    'node18',
  ],
  sourcemap: true,
  minify: true,
  clean: true,
  dts: true,
  hooks: {
    // With sourcemap on, the declaration files also get a sourceMappingURL
    // comment, but rolldown-plugin-dts drops the .d.ts.map it points to unless
    // declaration maps are on. Remove the dangling comment.
    async 'build:done'({ chunks }) {
      for (const chunk of chunks) {
        if (/\.d\.c?ts$/.test(chunk.fileName)) {
          const file = join(chunk.outDir, chunk.fileName);
          const code = await readFile(file, 'utf8');
          await writeFile(
            file,
            code.replace(/\n\/\/# sourceMappingURL=\S+$/, '\n'),
          );
        }
      }
    },
  },
});
