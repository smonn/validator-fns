// Each variant removes one fast path from the source with a single text
// replacement. `from` must occur exactly once, so a drifted source fails the
// build instead of silently measuring the baseline.

const syncLoopMain = `          const syncTest = syncTests.get(validatorTest);
          // Not a ternary: @vitest/coverage-v8 5 gives the branch after an
          // await in a ternary arm a negative count.
          let result: ValidatorResult;
          if (syncTest) {
            result = syncTest(parsedValue, field);
          } else {
            result = await validatorTest(parsedValue, field);
          }`;

const syncLoopNext = `            const syncTest = validatorTest[syncTwin];
            // Not a ternary: @vitest/coverage-v8 5 gives the branch after an
            // await in a ternary arm a negative count.
            let result: ValidatorResult<unknown, string>;
            if (syncTest) {
              result = syncTest(parsedValue, field);
            } else {
              result = await validatorTest(parsedValue, field);
            }`;

export const variants = {
  main: {
    'no-array-fast-path': [
      {
        file: 'src/arrays.ts',
        from: `  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return items;
  }

`,
        to: '',
      },
    ],
    'no-boolean-fast-path': [
      {
        file: 'src/booleans.ts',
        from: `  if (typeof value === 'boolean') {
    return value;
  }

`,
        to: '',
      },
    ],
    'no-string-fast-path': [
      {
        file: 'src/strings.ts',
        from: `  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();`,
        to: `  if (value instanceof Date) {
    return value.toISOString();`,
      },
    ],
    'no-number-number-fast-path': [
      {
        file: 'src/numbers.ts',
        from: `  if (typeof value === 'number') {
    return value;
  }

`,
        to: '',
      },
    ],
    'no-number-string-fast-path': [
      {
        file: 'src/numbers.ts',
        from: `  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

`,
        to: '',
      },
    ],
    'no-sync-tests': [
      {
        file: 'src/factories.ts',
        from: syncLoopMain,
        to: `          const result: ValidatorResult = await validatorTest(
            parsedValue,
            field,
          );`,
      },
      {
        file: 'src/factories.ts',
        from: `  syncTests.set(validatorTest, syncTest);
`,
        to: '',
      },
    ],
  },
  next: {
    'no-array-fast-path': [
      {
        file: 'src/arrays.ts',
        from: `  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return items;
  }

`,
        to: '',
      },
    ],
    'no-boolean-fast-path': [
      {
        file: 'src/booleans.ts',
        from: `  if (typeof value === 'boolean') {
    return value;
  }

`,
        to: '',
      },
    ],
    'no-string-fast-path': [
      {
        file: 'src/strings.ts',
        from: `  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();`,
        to: `  if (value instanceof Date) {
    return value.toISOString();`,
      },
    ],
    'no-unbox-early-return': [
      {
        file: 'src/primitives.ts',
        from: `  if (typeof value !== 'object' || value === null) {
    return value;
  }

`,
        to: '',
      },
    ],
    'no-sync-twin': [
      {
        file: 'src/factories.ts',
        from: syncLoopNext,
        to: `            const result: ValidatorResult<unknown, string> =
              await validatorTest(parsedValue, field);`,
      },
      {
        file: 'src/factories.ts',
        from: `  return Object.assign(validationTest, { [syncTwin]: twin });`,
        to: `  return validationTest;`,
      },
    ],
  },
};
