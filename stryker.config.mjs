export default {
  mutate: ['src/**/*.ts'],
  // Runs the whole suite for each mutant. @stryker-mutator/vitest-runner is
  // faster, but it needs vitest 2 or later; #607 switches to it after #575
  // upgrades vitest.
  testRunner: 'command',
  commandRunner: { command: 'pnpm exec vitest run' },
  reporters: ['clear-text', 'progress'],
  thresholds: {
    // The lowest score measured when this check was added, 89.64, rounded
    // down. Raise it as the score improves; lowering it loosens the check and
    // needs approval.
    break: 89,
  },
  // Stryker rewrites paths in the tsconfig it's given for its sandbox, using
  // TypeScript's JS API, which TypeScript 7 doesn't have. tsconfig.json has no
  // paths outside the project to rewrite, so name a file that doesn't exist,
  // which skips the rewrite.
  tsconfigFile: 'no-tsconfig-rewrite.json',
};
