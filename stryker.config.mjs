export default {
  mutate: ['src/**/*.ts'],
  // Runs only the tests that cover each mutant, and reports mutants no test
  // reaches as NoCoverage.
  testRunner: 'vitest',
  // Stryker finds plugins next to its own install, which pnpm keeps apart from
  // the project's node_modules, so name the runner here.
  plugins: ['@stryker-mutator/vitest-runner'],
  reporters: ['clear-text', 'progress'],
  thresholds: {
    // Four runs when this check was added scored 89.38 to 90.03; the score
    // moves with fast-check's seed and with timeouts under load. 88 keeps
    // about 10 mutants of margin below the lowest. Raise it as the score
    // improves; lowering it loosens the check and needs approval.
    break: 88,
  },
  // Stryker rewrites paths in the tsconfig it's given for its sandbox, using
  // TypeScript's JS API, which TypeScript 7 doesn't have. tsconfig.json has no
  // paths outside the project to rewrite, so name a file that doesn't exist,
  // which skips the rewrite.
  tsconfigFile: 'no-tsconfig-rewrite.json',
};
