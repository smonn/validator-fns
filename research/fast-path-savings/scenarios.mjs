// Scenarios per branch. Parser scenarios call the exported parser directly;
// validator scenarios run one type validator; suite scenarios copy
// benchmark/index.mjs from each branch. Each value pool holds 16 values of one
// type, so call sites stay monomorphic but the JIT can't fold a constant.

const pool = (make) => Array.from({ length: 16 }, (_, i) => make(i));

const arrays = pool((i) => [`a${i}`, `b${i}`, `c${i}`]);
const booleans = pool((i) => i % 2 === 0);
const strings = pool((i) => `hello ${i}`);
const numbers = pool((i) => 18 + i);
const numericStrings = pool((i) => String(18 + i));
const bigints = pool((i) => BigInt(18 + i));

function sync(fn, values) {
  return { kind: 'sync', run: (i) => fn(values[i & 15]) };
}

function async(fn, values) {
  return { kind: 'async', run: (i) => fn(values[i & 15]) };
}

const ONE_DAY = 1000 * 60 * 60 * 24;
const TEN_DAYS = ONE_DAY * 10;

function suite(V, schemas, invalidCheck) {
  const now = new Date();
  const startDate = new Date(now.getTime() + ONE_DAY);
  const simpleObject = {
    name: 'John Doe',
    email: 'john.doe@company.space',
    firstName: 'John',
    phone: '123-4567',
    age: 33,
  };
  const { simpleValidate, complexValidate } = schemas(V, now);
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
  let counter = 0;
  return {
    'suite: simple': { kind: 'async', run: () => simpleValidate(simpleObject) },
    'suite: simple (distinct values)': {
      kind: 'async',
      run: () => {
        const i = counter++;
        return simpleValidate({
          name: `John Doe ${i}`,
          email: `john.doe.${i}@company.space`,
          firstName: `John ${i}`,
          phone: `123-${i}`,
          age: 18 + i,
        });
      },
    },
    'suite: complex': {
      kind: 'async',
      run: () => complexValidate(complexObject),
    },
    'suite: complex (distinct values)': {
      kind: 'async',
      run: () => {
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
      },
    },
    'suite: complex (invalid values)': {
      kind: 'async',
      run: async () => {
        const result = await complexValidate(invalidComplexObject);
        if (!invalidCheck(result)) throw new Error('Expected invalid.');
      },
    },
  };
}

const carMakers = [
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
];

const customValidator = (V) => (value, field) =>
  value === 'hello'
    ? V.valid({ value, field })
    : V.invalid({ message: 'Must be "hello".', value, field });

function mainSchemas(V, now) {
  const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);
  return {
    simpleValidate: V.object({
      name: V.string(
        V.required('required'),
        V.min(4, 'min:4'),
        V.max(25, 'max:25'),
      ),
      email: V.string(V.required('required'), V.email('email')),
      firstName: V.string(V.required('required')),
      phone: V.string(V.required('required')),
      age: V.number(V.required('required'), V.min(18, 'min:18')),
    }),
    complexValidate: V.object({
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
          V.oneOf(carMakers, 'Must be a known car brand.'),
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
      postalCode: V.string(
        V.matches(/^\d{5}$/, 'Must be a five-digit number.'),
      ),
      custom: customValidator(V),
    }),
  };
}

function nextSchemas(V, now) {
  const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);
  return {
    simpleValidate: V.object({
      name: V.string(
        { requiredMessage: 'required' },
        V.min(4, 'min:4'),
        V.max(25, 'max:25'),
      ),
      email: V.string({ requiredMessage: 'required' }, V.email('email')),
      firstName: V.string({ requiredMessage: 'required' }),
      phone: V.string({ requiredMessage: 'required' }),
      age: V.number({ requiredMessage: 'required' }, V.min(18, 'min:18')),
    }),
    complexValidate: V.object({
      firstName: V.string({
        default: '',
        trim: true,
        requiredMessage: 'First name is required.',
      }),
      emailAddress: V.string(
        { requiredMessage: 'Email address is required.' },
        V.email('Must be a valid email address.'),
      ),
      age: V.number(
        { round: 'floor', requiredMessage: 'Age is required.' },
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
          { requiredMessage: 'Car brand is required.' },
          V.oneOf(carMakers, 'Must be a known car brand.'),
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
      optIn: V.boolean({ requiredMessage: 'Must decide to opt in or out.' }),
      notRobot: V.number(
        { requiredMessage: 'Must enter the correct answer.' },
        V.exact(42, 'This is the answer.'),
      ),
      postalCode: V.optional(
        V.string(V.matches(/^\d{5}$/, 'Must be a five-digit number.')),
      ),
      custom: customValidator(V),
    }),
  };
}

export function scenarios(branch, V) {
  if (branch === 'main') {
    const req = (m) => V.required(m);
    return {
      'parseArray(array)': sync(V.parseArray, arrays),
      'parseBoolean(boolean)': sync(V.parseBoolean, booleans),
      'parseString(string)': sync(V.parseString, strings),
      'parseNumber(number)': sync(V.parseNumber, numbers),
      'parseNumber(string)': sync(V.parseNumber, numericStrings),
      'array(string) validator': async(
        V.array(V.string(req('r')), V.min(1, 'm')),
        arrays,
      ),
      'boolean validator': async(V.boolean(req('r')), booleans),
      'string validator, 3 tests': async(
        V.string(req('r'), V.min(2, 'm'), V.max(50, 'm')),
        strings,
      ),
      'number validator (number)': async(
        V.number(req('r'), V.min(0, 'm')),
        numbers,
      ),
      'number validator (string)': async(
        V.number(req('r'), V.min(0, 'm')),
        numericStrings,
      ),
      ...suite(V, mainSchemas, (result) => !result.isValid),
    };
  }

  const req = { requiredMessage: 'r' };
  return {
    'parseArray(array)': sync(V.parseArray, arrays),
    'parseBoolean(boolean)': sync(V.parseBoolean, booleans),
    'parseString(string)': sync(V.parseString, strings),
    'parseString(number)': sync(V.parseString, numbers),
    'parseNumber(string)': sync(V.parseNumber, numericStrings),
    'parseString(boolean)': sync(V.parseString, booleans),
    'parseString(bigint)': sync(V.parseString, bigints),
    'array(string) validator': async(
      V.array(V.string(req), V.min(1, 'm')),
      arrays,
    ),
    'boolean validator': async(V.boolean(req), booleans),
    'string validator, 2 tests': async(
      V.string(req, V.min(2, 'm'), V.max(50, 'm')),
      strings,
    ),
    'number validator (number)': async(V.number(req, V.min(0, 'm')), numbers),
    'number validator (string)': async(
      V.number(req, V.min(0, 'm')),
      numericStrings,
    ),
    ...suite(V, nextSchemas, (result) => result.state === 'invalid'),
  };
}
