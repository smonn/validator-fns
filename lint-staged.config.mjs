/** @type {import('lint-staged').Configuration} */
export default {
  // Every staged file goes to both tools, which skip the files they don't
  // support or ignore, so the hook covers the same files as `pnpm lint` and
  // `pnpm format:check`. The flag makes a commit with no such file exit 0, as
  // in a standards sync commit, where oxfmt ignores CODING_STANDARDS.md.
  '*': [
    'oxlint --fix --deny-warnings --no-error-on-unmatched-pattern',
    'oxfmt --no-error-on-unmatched-pattern',
  ],
};
