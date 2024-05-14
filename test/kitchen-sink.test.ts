import { assert, test } from 'vitest';
import {
  array,
  boolean,
  date,
  email,
  exact,
  integer,
  invalid,
  matches,
  max,
  maxDate,
  min,
  minDate,
  number,
  object,
  oneOf,
  required,
  string,
  url,
  valid,
  type ExtractError,
  type InvalidResult,
  type ValidatorTest,
} from '../src/index.js';

const ONE_DAY = 1000 * 60 * 60 * 24;
const TEN_DAYS = ONE_DAY * 10;
const now = new Date();
const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);

const customValidator: ValidatorTest<string, string> = async (value, field) => {
  if (value === 'hello') {
    return valid({ value, field });
  }

  return invalid({
    message: 'Must be "hello".',
    value,
    field,
  });
};

const validate = object({
  firstName: string(
    { default: '', trim: true },
    required('First name is required.'),
  ),
  emailAddress: string(
    required('Email address is required.'),
    email('Must be a valid email address.'),
  ),
  age: number(
    { round: 'floor' },
    required('Age is required.'),
    integer('Age must be a whole number.'),
    min(18, 'Must be at least 18 years old.'),
  ),
  homepage: string(url('Must be a valid URL.', ['http:', 'https:'])),
  fruit: string(
    { default: 'apple' },
    oneOf(
      ['apple', 'orange', 'banana'],
      ({ values }) => `Must be ${values[0]}, ${values[1]} or ${values[2]}.`,
    ),
  ),
  favoriteCarMakers: array(
    { default: [] },
    string(
      required('Car brand is required.'),
      oneOf(
        [
          'BMW',
          'Ferrari',
          'Fiat',
          'Ford',
          'Honda',
          'Kia',
          'Mercedes',
          'Subaru',
          'Tesla',
          'Toyota',
          'Volvo',
        ],
        'Must be a known car brand.',
      ),
    ),
    min(2, 'Must pick at least two.'),
    max(4, 'Must pick at most four.'),
  ),
  startDate: date(
    minDate(now, 'Must be on or after today.'),
    maxDate(tenDaysFromNow, 'Must be at most ten days from now.'),
  ),
  optIn: boolean(required('Must decide to opt in or out.')),
  notRobot: number(
    required('Must enter the correct answer.'),
    exact(42, 'This is the answer.'),
  ),
  postalCode: string(matches(/^\d{5}$/, 'Must be a five-digit number.')),
  custom: customValidator,
});

test('kitchen sink valid', async () => {
  const startDate = new Date(now.getTime() + ONE_DAY);

  const result = await validate({
    age: 20,
    custom: 'hello',
    emailAddress: 'foo@example.com',
    favoriteCarMakers: ['Ferrari', 'Tesla'],
    firstName: 'Bob',
    fruit: 'apple',
    homepage: 'https://www.example.com',
    notRobot: 42,
    optIn: false,
    postalCode: '12345',
    startDate,
  });

  assert.strictEqual(result.state, 'valid');
  assert.deepEqual(result.value, {
    age: 20,
    custom: 'hello',
    emailAddress: 'foo@example.com',
    favoriteCarMakers: ['Ferrari', 'Tesla'],
    firstName: 'Bob',
    fruit: 'apple',
    homepage: 'https://www.example.com',
    notRobot: 42,
    optIn: false,
    postalCode: '12345',
    startDate,
  });
});

test('kitchen sink invalid', async () => {
  const startDate = new Date(now.getTime() - ONE_DAY);

  const result = await validate({
    age: 10,
    custom: 'goodbye',
    emailAddress: 'invalid-email',
    favoriteCarMakers: ['Nissan', 'Volvo'],
    firstName: '',
    fruit: 'strawberry',
    homepage: 'invalid-url',
    notRobot: 10,
    postalCode: '1234',
    startDate,
  });

  assert.strictEqual(result.state, 'invalid');
  assert.deepEqual(result.value, {
    age: 10,
    custom: 'goodbye',
    emailAddress: 'invalid-email',
    favoriteCarMakers: ['Nissan', 'Volvo'],
    firstName: '',
    fruit: 'strawberry',
    homepage: 'invalid-url',
    notRobot: 10,
    postalCode: '1234',
    startDate,
  });
  const invalidResult = result as InvalidResult<ExtractError<typeof validate>>;
  assert.deepEqual(invalidResult.errors, {
    firstName: 'First name is required.',
    emailAddress: 'Must be a valid email address.',
    age: 'Must be at least 18 years old.',
    homepage: 'Must be a valid URL.',
    fruit: 'Must be apple, orange or banana.',
    // Note that this would be a string if the error is from the array validator.
    favoriteCarMakers: ['Must be a known car brand.', null],
    startDate: 'Must be on or after today.',
    notRobot: 'This is the answer.',
    optIn: 'Must decide to opt in or out.',
    postalCode: 'Must be a five-digit number.',
    custom: 'Must be "hello".',
  });
});
