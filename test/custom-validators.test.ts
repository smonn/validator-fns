import { assert, expectTypeOf, test } from 'vitest';
import {
  createTypeValidatorTest,
  invalid,
  type Messages,
  type Result,
  type TypeValidator,
  valid,
} from '../src/index.js';

// The custom type validator from the README's createTypeValidatorTest section.
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
  assert.deepInclude(
    await money({ messages: { required: 'Enter an amount.' } })(undefined),
    { state: 'invalid', message: 'Enter an amount.' },
  );
  assert.deepInclude(await money()({}), {
    state: 'invalid',
    message: 'Must be an amount.',
  });
});
