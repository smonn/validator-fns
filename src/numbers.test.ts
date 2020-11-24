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

  expect(await validate(0)).toEqual({ isValid: true, value: 0 });
  expect(await validate(-10)).toEqual({ isValid: true, value: -10 });
  expect(await validate(10)).toEqual({ isValid: true, value: 10 });
  expect(await validate(11)).toEqual({
    isValid: false,
    message: 'Must be at most 10.',
    value: 11,
  });
  expect(await validate(-11)).toEqual({
    isValid: false,
    message: 'Must be at least -10.',
    value: -11,
  });
  expect(await validate(NaN)).toEqual({
    isValid: false,
    message: 'Must enter a value.',
    value: NaN,
  });
  expect(await validate(undefined)).toEqual({
    isValid: false,
    message: 'Must enter a value.',
    value: undefined,
  });
  expect(await validate(null)).toEqual({
    isValid: false,
    message: 'Must enter a value.',
    value: null,
  });
});
