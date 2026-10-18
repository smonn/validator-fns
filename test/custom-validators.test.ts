import { assert, expectTypeOf, test } from 'vitest';
import {
  createTypeValidatorTest,
  type TypeValidator,
  type ValidatorMessage,
} from '../src/index.js';

// The custom type validator from the README's createTypeValidatorTest section.
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

test('custom type validator accepts its own config options', async () => {
  expectTypeOf(money({ cents: true })).toEqualTypeOf<
    TypeValidator<number, string>
  >();
  assert.deepEqual(await money({ cents: true })('12.5'), {
    state: 'valid',
    field: undefined,
    value: 1250,
  });
  assert.deepEqual(await money()('12.5'), {
    state: 'valid',
    field: undefined,
    value: 12.5,
  });
  assert.deepInclude(await money({ requiredMessage: 'Enter an amount.' })({}), {
    state: 'invalid',
    message: 'Enter an amount.',
  });
});
