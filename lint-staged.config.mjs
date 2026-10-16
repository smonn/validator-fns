/** @type {import('lint-staged').Configuration} */
export default {
  '*.ts': 'oxlint --fix --deny-warnings',
  // oxfmt exits 2 when every file it's given is ignored, as CODING_STANDARDS.md
  // is in a standards sync commit. The flag makes that case exit 0; oxfmt still
  // checks every staged file it doesn't ignore.
  '*.{ts,js,json,jsonc,md,yml,yaml}': 'oxfmt --no-error-on-unmatched-pattern',
};
