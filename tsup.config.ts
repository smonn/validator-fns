import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: true,
  dts: {
    compilerOptions: {
      // tsup sets baseUrl for its declaration build, and TypeScript 6 fails
      // on the deprecated option. Our tsconfig doesn't set it.
      ignoreDeprecations: '6.0',
    },
  },
});
