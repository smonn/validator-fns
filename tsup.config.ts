import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: true,
});
