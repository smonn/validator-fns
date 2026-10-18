// Type-checks a consumer project against the packed package's declarations,
// on the lowest TypeScript version the README states and on the current one,
// with skipLibCheck off so errors inside the declarations count. The fixture is
// the README's createTypeValidatorTest example, without type arguments, and a
// check() at a path read through messageTree(). A second fixture imports the
// 2.x type names v3 removes, and must fail on each, and a third makes calls
// with the options v3 removes, from 2.x and from its prereleases, and must
// fail on each line.
// Update `lowest` and the typescript-5.4 dev dependency with the README.
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const compilers = [
  {
    name: 'lowest',
    tsc: join(packageRoot, 'node_modules', 'typescript-5.4', 'bin', 'tsc'),
  },
  {
    name: 'current',
    tsc: join(packageRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
  },
];

const fixture = `import {
  check,
  createTypeValidatorTest,
  type ExtractValue,
  invalid,
  type Messages,
  messageTree,
  object,
  optional,
  type Result,
  string,
  valid,
  type Validator,
} from 'validator-fns';

interface MoneyConfig {
  parser: (
    value: unknown,
    field?: string,
  ) => Promise<Result<number | null | undefined>>;
  messages?: Messages;
  /** Convert the amount to cents. */
  cents?: boolean;
}

/** Reads a number or a numeric string, and fails anything else present. */
async function parseAmount(
  value: unknown,
  field?: string,
): Promise<Result<number | null | undefined>> {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (typeof amount === 'number' || amount === null || amount === undefined) {
    return valid({ value: amount, field });
  }

  return invalid({ code: 'type', message: 'Must be an amount.', field });
}

function applyMoneyConfig(
  amount: number | null | undefined,
  config: MoneyConfig,
): number | null | undefined {
  return config.cents && typeof amount === 'number'
    ? Math.round(amount * 100)
    : amount;
}

const money = createTypeValidatorTest(
  { parser: parseAmount },
  applyMoneyConfig,
);

export const price: Validator<number, string> = money({ cents: true });
export const order = object({
  name: string({ messages: { required: 'Required.' } }),
  note: optional(string()),
  price,
});
// note is optional and name required, on every TypeScript version.
export const minimal: ExtractValue<typeof order> = { name: 'a', price: 1 };

export const shipping = object(
  { billing: object({ zip: string() }), shipping: object({ zip: string() }) },
  check(
    ['shipping', 'zip'],
    (value) => value.shipping.zip === value.billing.zip,
    'match',
  ),
);
export async function shippingMessages(value: unknown) {
  const messages = messageTree(await shipping(value));
  return typeof messages === 'object' ? messages.shipping : messages;
}
`;

const tsconfig = {
  compilerOptions: {
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    target: 'ES2022',
    lib: ['ES2022'],
    module: 'ESNext',
    moduleResolution: 'Bundler',
    types: [],
  },
  include: ['index.ts'],
};

/** The 2.x type names v3 removes. */
const removedNames = [
  'ArrayItemValidatorResult',
  'ConfigBase',
  'DeepPartial',
  'InvalidResult',
  'SharedDateValueType',
  'SharedValueType',
  'ValidationTest',
  'ValidatorFactory',
  'ValidatorResult',
  'ValidatorTest',
  'ValidResult',
];
const removedFixture = `import type { ${removedNames.join(', ')} } from 'validator-fns';\n`;

/** Calls with the options v3 removes, one per line after the import. */
const removedCalls = [
  "number({ round: 'floor' });",
  "min(1, 'Too small.', true);",
  "max(1, 'Too big.', true);",
  "minDate(0, 'Too early.', true);",
  "maxDate(0, 'Too late.', true);",
  "number({ requiredMessage: 'Required.' });",
  'min(1, ({ limit }) => `${limit}`);',
];
const removedCallsFixture = `import { max, maxDate, min, minDate, number } from 'validator-fns';\n${removedCalls.join('\n')}\n`;

/**
 * @param {unknown} error
 */
function stdoutOf(error) {
  return error && typeof error === 'object' && 'stdout' in error
    ? String(error.stdout)
    : '';
}

/**
 * Type-checks a project and returns tsc's output, or `undefined` when it
 * passes.
 * @param {string} tsc
 * @param {string} cwd
 * @param {string} project
 */
function typeErrors(tsc, cwd, project) {
  try {
    run(process.execPath, [tsc, '--project', project], cwd);
    return undefined;
  } catch (error) {
    return stdoutOf(error);
  }
}

/**
 * Returns the removed names the declarations still export.
 * @param {string} tsc
 * @param {string} cwd
 */
function stillExported(tsc, cwd) {
  const output = typeErrors(tsc, cwd, 'tsconfig.removed.json');
  if (output === undefined) {
    return removedNames;
  }

  const missing = new Set(
    Array.from(
      // tsc reports a name the declarations keep unexported as declared locally.
      output.matchAll(
        /(?:has no exported member (?:named )?|declares )'(\w+)'/g,
      ),
      (match) => match[1],
    ),
  );
  return removedNames.filter((name) => !missing.has(name));
}

/**
 * Returns the removed calls the declarations still accept.
 * @param {string} tsc
 * @param {string} cwd
 */
function stillAccepted(tsc, cwd) {
  const output = typeErrors(tsc, cwd, 'tsconfig.calls.json');
  if (output === undefined) {
    return removedCalls;
  }

  const failingLines = new Set(
    Array.from(output.matchAll(/removed-calls\.ts\((\d+),/g), (match) =>
      Number(match[1]),
    ),
  );
  // The import is line 1.
  return removedCalls.filter((_, index) => !failingLines.has(index + 2));
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

const workDir = mkdtempSync(join(tmpdir(), 'validator-fns-types-'));

try {
  run('pnpm', ['pack', '--pack-destination', workDir], packageRoot);
  const tarball = readdirSync(workDir).find((name) => name.endsWith('.tgz'));
  if (!tarball) {
    throw new Error('pnpm pack produced no tarball');
  }

  const consumer = join(workDir, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    '{ "private": true, "type": "module" }\n',
  );
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(tsconfig));
  writeFileSync(join(consumer, 'index.ts'), fixture);
  writeFileSync(
    join(consumer, 'tsconfig.removed.json'),
    JSON.stringify({ ...tsconfig, include: ['removed.ts'] }),
  );
  writeFileSync(join(consumer, 'removed.ts'), removedFixture);
  writeFileSync(
    join(consumer, 'tsconfig.calls.json'),
    JSON.stringify({ ...tsconfig, include: ['removed-calls.ts'] }),
  );
  writeFileSync(join(consumer, 'removed-calls.ts'), removedCallsFixture);
  run(
    'npm',
    ['install', '--offline', '--no-audit', '--no-fund', join(workDir, tarball)],
    consumer,
  );

  for (const { name, tsc } of compilers) {
    const version = run(process.execPath, [tsc, '--version'], consumer).trim();
    try {
      run(process.execPath, [tsc, '--project', 'tsconfig.json'], consumer);
    } catch (error) {
      throw new Error(
        `The declarations fail to type-check on the ${name} TypeScript (${version}):\n${stdoutOf(error)}`,
        { cause: error },
      );
    }

    const exported = stillExported(tsc, consumer);
    if (exported.length > 0) {
      throw new Error(
        `The declarations still export ${exported.join(', ')} on the ${name} TypeScript (${version}).`,
      );
    }

    const accepted = stillAccepted(tsc, consumer);
    if (accepted.length > 0) {
      throw new Error(
        `The declarations still accept ${accepted.join(' ')} on the ${name} TypeScript (${version}).`,
      );
    }

    console.log(`Declarations type-check on ${version} (${name}).`);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
