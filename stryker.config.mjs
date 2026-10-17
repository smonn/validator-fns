export default {
  mutate: ['src/**/*.ts'],
  // Runs the whole suite for each mutant. @stryker-mutator/vitest-runner is
  // faster, but it needs vitest 2 or later; #607 switches to it after #575
  // upgrades vitest.
  testRunner: 'command',
  commandRunner: { command: 'pnpm exec vitest run' },
  reporters: ['clear-text', 'progress'],
  thresholds: {
    // Three runs when this check was added scored 89.38 to 90.03; the score
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
