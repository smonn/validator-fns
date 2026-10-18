// Type-checks a consumer project against the packed package's declarations,
// on the lowest TypeScript version the README states and on the current one,
// with skipLibCheck off so errors inside the declarations count. The fixture is
// the README's createTypeValidatorTest example, without type arguments. A
// second fixture imports the 2.x type names v3 removes, and must fail on each.
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
  createTypeValidatorTest,
  type ExtractValue,
  object,
  optional,
  string,
  type Validator,
  type ValidatorMessage,
} from 'validator-fns';

interface MoneyConfig {
  parser: (value: unknown) => number | null | undefined;
  requiredMessage?: ValidatorMessage<number>;
  /** Convert the amount to cents. */
  cents?: boolean;
}

/** Reads a number or a numeric string. Anything else is missing. */
function parseAmount(value: unknown): number | undefined {
  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  return typeof value === 'number' ? value : undefined;
}

function applyMoneyConfig(
  value: unknown,
  config: MoneyConfig,
): number | null | undefined {
  const amount = config.parser(value);
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
  name: string({ requiredMessage: 'Required.' }),
  note: optional(string()),
  price,
});
// note is optional and name required, on every TypeScript version.
export const minimal: ExtractValue<typeof order> = { name: 'a', price: 1 };
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

/**
 * @param {unknown} error
 */
function stdoutOf(error) {
  return error && typeof error === 'object' && 'stdout' in error
    ? String(error.stdout)
    : '';
}

/**
 * Returns the removed names the declarations still export.
 * @param {string} tsc
 * @param {string} cwd
 */
function stillExported(tsc, cwd) {
  try {
    run(process.execPath, [tsc, '--project', 'tsconfig.removed.json'], cwd);
    return removedNames;
  } catch (error) {
    const output = stdoutOf(error);
    const missing = new Set(
      Array.from(
        // A name the declarations keep for their own use is declared locally.
        output.matchAll(
          /(?:has no exported member (?:named )?|declares )'(\w+)'/g,
        ),
        (match) => match[1],
      ),
    );
    return removedNames.filter((name) => !missing.has(name));
  }
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

    console.log(`Declarations type-check on ${version} (${name}).`);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
