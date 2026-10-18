import Benchmark from 'benchmarkify';
const benchmark = new Benchmark('Benchmark validator-fns').printHeader();
import * as V from 'validator-fns';

// --smoke runs each scenario only briefly, so `pnpm check` catches a scenario
// that fails without waiting for real measurements.
const smoke = process.argv.includes('--smoke');
const suite = benchmark.createSuite(
  'validator-fns',
  smoke ? { time: 1, cycles: 1, minSamples: 1 } : {},
);

// benchmarkify's done() takes no error, and a run that never calls it hangs
// the suite, so a rejected run exits with its error.
function fail(error) {
  console.error(error);
  process.exit(1);
}

/**
 * @param {string} name
 * @param {() => Promise<unknown>} run
 */
function add(name, run) {
  suite.add(name, (done) => {
    run().then(() => done(), fail);
  });
}

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
    { messages: { required: 'required' } },
    V.min(4, 'min:4'),
    V.max(25, 'max:25'),
  ),
  email: V.string({ messages: { required: 'required' } }, V.email('email')),
  firstName: V.string({ messages: { required: 'required' } }),
  phone: V.string({ messages: { required: 'required' } }),
  age: V.number({ messages: { required: 'required' } }, V.min(18, 'min:18')),
});

add('simple', () => simpleValidate(simpleObject));

// Real traffic rarely repeats exact values, so these scenarios build a new
// value per call. The counter makes each object distinct across iterations.
let counter = 0;

add('simple (distinct values)', () => {
  const i = counter++;
  return simpleValidate({
    name: `John Doe ${i}`,
    email: `john.doe.${i}@company.space`,
    firstName: `John ${i}`,
    phone: `123-${i}`,
    age: 18 + i,
  });
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

  return V.invalid({
    code: 'hello',
    message: 'Must be "hello".',
    value,
    field,
  });
};

const complexValidate = V.object({
  firstName: V.string(
    { trim: true, messages: { required: 'First name is required.' } },
    V.min(1, 'First name is required.'),
  ),
  emailAddress: V.string(
    { messages: { required: 'Email address is required.' } },
    V.email('Must be a valid email address.'),
  ),
  age: V.number(
    { messages: { required: 'Age is required.' } },
    V.integer('Age must be a whole number.'),
    V.min(18, 'Must be at least 18 years old.'),
  ),
  homepage: V.optional(
    V.string(V.url('Must be a valid URL.', ['http:', 'https:'])),
  ),
  fruit: V.string(
    { default: 'apple' },
    V.oneOf(
      ['apple', 'orange', 'banana'],
      ({ values }) => `Must be ${values[0]}, ${values[1]} or ${values[2]}.`,
    ),
  ),
  favoriteCarMakers: V.array(
    V.string(
      { messages: { required: 'Car brand is required.' } },
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
    { default: [] },
    V.min(2, 'Must pick at least two.'),
    V.max(4, 'Must pick at most four.'),
  ),
  startDate: V.optional(
    V.date(
      V.minDate(now, 'Must be on or after today.'),
      V.maxDate(tenDaysFromNow, 'Must be at most ten days from now.'),
    ),
  ),
  optIn: V.boolean({ messages: { required: 'Must decide to opt in or out.' } }),
  notRobot: V.number(
    { messages: { required: 'Must enter the correct answer.' } },
    V.exact(42, 'This is the answer.'),
  ),
  postalCode: V.optional(
    V.string(V.matches(/^\d{5}$/, 'Must be a five-digit number.')),
  ),
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

add('complex', () => complexValidate(complexObject));

add('complex (distinct values)', () => {
  const i = counter++;
  return complexValidate({
    ...complexObject,
    age: 18 + i,
    emailAddress: `foo.${i}@example.com`,
    firstName: `Bob ${i}`,
    homepage: `https://www.example.com/${i}`,
    postalCode: String(i % 100_000).padStart(5, '0'),
    startDate: new Date(startDate.getTime() + (i % ONE_DAY)),
  });
});

// Every field fails, so each call builds an invalid result per field.
const invalidComplexObject = {
  age: 17.5,
  custom: 'goodbye',
  emailAddress: 'foo',
  favoriteCarMakers: ['Lada'],
  firstName: '',
  fruit: 'kiwi',
  homepage: 'ftp://example.com',
  notRobot: 41,
  optIn: null,
  postalCode: '1234',
  startDate: new Date(now.getTime() - TEN_DAYS),
};

add('complex (invalid values)', async () => {
  const result = await complexValidate(invalidComplexObject);
  if (result.state === 'valid') {
    throw new Error('Expected an invalid result.');
  }
});

suite.run();
