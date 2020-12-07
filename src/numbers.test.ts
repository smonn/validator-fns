import { integer, number } from './numbers';
import { max, min, required } from './shared';

test('min', async () => {
  const validate = min(5, 'min:{min}', true);
  expect(await validate(NaN)).toMatchObject({ isValid: false });
  expect(await validate(0)).toMatchObject({ isValid: false });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate(5.01)).toMatchObject({ isValid: true });
  expect(await validate(5)).toMatchObject({ isValid: false });
  expect(await validate(4.99)).toMatchObject({ isValid: false });
});

test('max', async () => {
  const validate = max(5, 'max:{max}', true);
  expect(await validate(NaN)).toMatchObject({ isValid: false });
  expect(await validate(0)).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate(5.01)).toMatchObject({ isValid: false });
  expect(await validate(5)).toMatchObject({ isValid: false });
  expect(await validate(4.99)).toMatchObject({ isValid: true });
});

test('integer', async () => {
  const validate = integer('integer');
  expect(await validate(NaN)).toMatchObject({ isValid: false });
  expect(await validate(0)).toMatchObject({ isValid: true });
  expect(await validate(null)).toMatchObject({ isValid: true });
  expect(await validate(undefined)).toMatchObject({ isValid: true });
  expect(await validate(0.1)).toMatchObject({ isValid: false });
  expect(await validate(1e-1)).toMatchObject({ isValid: false });
});

test('number', async () => {
  const validate = number(
    required('Must enter a value.'),
    min(-10, 'Must be at least -10.'),
    max(10, 'Must be at most 10.')
  );

  expect(await validate(0)).toEqual({
    isValid: true,
    state: 'valid',
    value: 0,
  });
  expect(await validate(-10)).toEqual({
    isValid: true,
    state: 'valid',
    value: -10,
  });
  expect(await validate(10)).toEqual({
    isValid: true,
    state: 'valid',
    value: 10,
  });
  expect(await validate(11)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must be at most 10.',
    value: 11,
  });
  expect(await validate(-11)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must be at least -10.',
    value: -11,
  });
  expect(await validate(NaN)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: NaN,
  });
  expect(await validate(new Date(0))).toEqual({
    isValid: true,
    state: 'valid',
    value: 0,
  });
  expect(await validate(undefined)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: undefined,
  });
  expect(await validate(null)).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
    message: 'Must enter a value.',
    value: null,
  });
  expect(await validate({})).toEqual({
    isValid: false,
    state: 'invalid',
    errors: null,
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
