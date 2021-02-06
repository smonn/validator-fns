import { integer, number } from '../src/numbers';
import { max, min, required } from '../src/shared';

test('min', async () => {
  const validate = min(5, 'min:{min}', true);
  expect(await validate(NaN)).toMatchObject({ state: 'invalid' });
  expect(await validate(0)).toMatchObject({ state: 'invalid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate(5.01)).toMatchObject({ state: 'valid' });
  expect(await validate(5)).toMatchObject({ state: 'invalid' });
  expect(await validate(4.99)).toMatchObject({ state: 'invalid' });
});

test('max', async () => {
  const validate = max(5, 'max:{max}', true);
  expect(await validate(NaN)).toMatchObject({ state: 'invalid' });
  expect(await validate(0)).toMatchObject({ state: 'valid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate(5.01)).toMatchObject({ state: 'invalid' });
  expect(await validate(5)).toMatchObject({ state: 'invalid' });
  expect(await validate(4.99)).toMatchObject({ state: 'valid' });
});

test('integer', async () => {
  const validate = integer('integer');
  expect(await validate(NaN)).toMatchObject({ state: 'invalid' });
  expect(await validate(0)).toMatchObject({ state: 'valid' });
  expect(await validate(null)).toMatchObject({ state: 'valid' });
  expect(await validate(undefined)).toMatchObject({ state: 'valid' });
  expect(await validate(0.1)).toMatchObject({ state: 'invalid' });
  expect(await validate(1e-1)).toMatchObject({ state: 'invalid' });
});

test('number', async () => {
  const validate = number(
    required('Must enter a value.'),
    min(-10, 'Must be at least -10.'),
    max(10, 'Must be at most 10.')
  );

  expect(await validate(0)).toMatchObject({
    state: 'valid',
    value: 0,
  });
  expect(await validate(-10)).toMatchObject({
    state: 'valid',
    value: -10,
  });
  expect(await validate(10)).toMatchObject({
    state: 'valid',
    value: 10,
  });
  expect(await validate(11)).toMatchObject({
    state: 'invalid',
    message: 'Must be at most 10.',
    value: 11,
  });
  expect(await validate(-11)).toMatchObject({
    state: 'invalid',
    message: 'Must be at least -10.',
    value: -11,
  });
  expect(await validate(NaN)).toMatchObject({
    state: 'invalid',
    message: 'Must enter a value.',
    value: NaN,
  });
  expect(await validate(new Date(0))).toMatchObject({
    state: 'valid',
    value: 0,
  });
  expect(await validate(undefined)).toMatchObject({
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
  });
  expect(await validate(null)).toMatchObject({
    state: 'invalid',
    message: 'Must enter a value.',
    value: null,
  });
  expect(await validate({})).toMatchObject({
    state: 'invalid',
    message: 'Must enter a value.',
    value: NaN,
  });
});

test('rounding', async () => {
  const nearest = number({ round: 'nearest' });
  const floor = number({ round: 'floor' });
  const ceil = number({ round: 'ceil' });

  await expect(nearest(0.9)).resolves.toMatchObject({
    value: 1,
  });
  await expect(floor(0.9)).resolves.toMatchObject({
    value: 0,
  });
  await expect(ceil(0.1)).resolves.toMatchObject({
    value: 1,
  });
});

test('number default', async () => {
  const validate = number({ default: 5 });
  await expect(validate(undefined)).resolves.toMatchObject({
    state: 'valid',
    value: 5,
  });
});
