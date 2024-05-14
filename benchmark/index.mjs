import Benchmark from 'benchmarkify';
const benchmark = new Benchmark('Benchmark validator-fns').printHeader();
import * as V from 'validator-fns';

const suite = benchmark.createSuite('validator-fns');

// SIMPLE

const simpleObject = {
  name: 'John Doe',
  email: 'john.doe@company.space',
  firstName: 'John',
  phone: '123-4567',
  age: 33,
};

const simpleValidate = V.object({
  name: V.string(
    V.required('required'),
    V.min(4, 'min:4'),
    V.max(25, 'max:25'),
  ),
  email: V.string(V.required('required'), V.email('email')),
  firstName: V.string(V.required('required')),
  phone: V.string(V.required('required')),
  age: V.number(V.required('required'), V.min(18, 'min:18')),
});

suite.add('simple', (done) => {
  simpleValidate(simpleObject).then(() => done());
});

// COMPLEX

const ONE_DAY = 1000 * 60 * 60 * 24;
const TEN_DAYS = ONE_DAY * 10;
const now = new Date();
const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);

const customValidator = (value, field) => {
  if (value === 'hello') {
    return V.valid({ value, field });
  }

  return V.invalid('Must be "hello".', value, field, null);
};

const complexValidate = V.object({
  firstName: V.string(
    { default: '', trim: true },
    V.required('First name is required.'),
  ),
  emailAddress: V.string(
    V.required('Email address is required.'),
    V.email('Must be a valid email address.'),
  ),
  age: V.number(
    { round: 'floor' },
    V.required('Age is required.'),
    V.integer('Age must be a whole number.'),
    V.min(18, 'Must be at least 18 years old.'),
  ),
  homepage: V.string(V.url('Must be a valid URL.', ['http:', 'https:'])),
  fruit: V.string(
    { default: 'apple' },
    V.oneOf(
      ['apple', 'orange', 'banana'],
      ({ values }) => `Must be ${values[0]}, ${values[1]} or ${values[2]}.`,
    ),
  ),
  favoriteCarMakers: V.array(
    { default: [] },
    V.string(
      V.required('Car brand is required.'),
      V.oneOf(
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
    V.min(2, 'Must pick at least two.'),
    V.max(4, 'Must pick at most four.'),
  ),
  startDate: V.date(
    V.minDate(now, 'Must be on or after today.'),
    V.maxDate(tenDaysFromNow, 'Must be at most ten days from now.'),
  ),
  optIn: V.boolean(V.required('Must decide to opt in or out.')),
  notRobot: V.number(
    V.required('Must enter the correct answer.'),
    V.exact(42, 'This is the answer.'),
  ),
  postalCode: V.string(V.matches(/^\d{5}$/, 'Must be a five-digit number.')),
  custom: customValidator,
});

const startDate = new Date(now.getTime() + ONE_DAY);

const complexObject = {
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
};

suite.add('complex', (done) => {
  complexValidate(complexObject).then(() => done());
});

suite.run();
