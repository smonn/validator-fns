import { assert, test } from 'vitest';
import {
  email,
  exact,
  integer,
  matches,
  max,
  maxDate,
  min,
  minDate,
  oneOf,
  url,
  uuid,
} from '../src/index.js';

/**
 * Calls a test the way JavaScript can, with a value outside its type, which
 * TypeScript rejects.
 */
async function callUntyped(
  validate: (...args: never[]) => unknown,
  value: unknown,
): Promise<unknown> {
  return Reflect.apply(validate, undefined, [value]);
}

const builtInTests: [string, (...args: never[]) => unknown][] = [
  ['min', min(0, 'failed')],
  ['max', max(1, 'failed')],
  ['exact', exact(0, 'failed')],
  ['oneOf', oneOf(['a'], 'failed')],
  ['integer', integer('failed')],
  ['email', email('failed')],
  ['matches', matches(/.*/, 'failed')],
  ['url', url('failed')],
  ['uuid', uuid('failed')],
  ['minDate', minDate(new Date(0), 'failed')],
  ['maxDate', maxDate(new Date(0), 'failed')],
];

test('a built-in test fails a missing value it is called with directly', async () => {
  const results = await Promise.all(
    builtInTests.flatMap(([code, validate]) =>
      [null, undefined].map(async (value) => ({
        code,
        label: `${code}(${String(value)})`,
        result: await callUntyped(validate, value),
      })),
    ),
  );

  for (const { code, label, result } of results) {
    assert.deepInclude(
      result,
      {
        state: 'invalid',
        code,
        message: 'failed',
        field: undefined,
        errors: undefined,
      },
      label,
    );
  }
});

test("a built-in test checks '' as a string", async () => {
  assert.deepInclude(await min(1, 'min')(''), { state: 'invalid' });
  assert.deepInclude(await max(1, 'max')(''), { state: 'valid' });
  assert.deepInclude(await exact(0, 'exact')(''), { state: 'valid' });
  assert.deepInclude(await matches(/^$/, 'matches')(''), { state: 'valid' });
  assert.deepInclude(await email('email')(''), { state: 'invalid' });
  assert.deepInclude(await url('url')(''), { state: 'invalid' });
  assert.deepInclude(await uuid('uuid')(''), { state: 'invalid' });
});
