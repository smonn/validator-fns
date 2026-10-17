import { assert, expectTypeOf, test } from 'vitest';
import {
  type ConfigBase,
  createTypeValidatorTest,
  parseNumber,
  type TypeValidator,
} from '../src/index.js';

// The custom type validator from the README's createTypeValidatorTest section.
interface MoneyConfig extends ConfigBase<number> {
  /** Convert the amount to cents. */
  cents?: boolean;
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
  { parser: parseNumber },
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
});
