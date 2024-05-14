import { defineConfig, coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['runkit.js', 'benchmark/**', ...coverageConfigDefaults.exclude],
    },
  },
});
