const Benchmark = require('benchmarkify');
const benchmark = new Benchmark('Benchmark validator-fns').printHeader();
const {
	array,
	boolean,
	date,
	email,
	exact,
	integer,
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
	invalid
} = require('validator-fns');

const suite = benchmark.createSuite('validator-fns');

// SIMPLE

const simpleObject = {
	name: 'John Doe',
	email: 'john.doe@company.space',
	firstName: 'John',
	phone: '123-4567',
	age: 33
};

const simpleValidate = object({
	name: string(required('required'), min(4, 'min:4'), max(25, 'max:25')),
	email: string(required('required'), email('email')),
	firstName: string(required('required')),
	phone: string(required('required')),
	age: number(required('required'), min(18, 'min:18'))
});

suite.add('simple', done => {
	simpleValidate(simpleObject).then(() => done());
});

// COMPLEX

const ONE_DAY = 1000 * 60 * 60 * 24;
const TEN_DAYS = ONE_DAY * 10;
const now = new Date();
const tenDaysFromNow = new Date(now.getTime() + TEN_DAYS);

const customValidator = (value, field) => {
	if (value === 'hello') {
		return valid({value, field});
	}

	return invalid('Must be "hello".', value, field, null);
};

const complexValidate = object({
	firstName: string(
		{default: '', trim: true},
		required('First name is required.')
	),
	emailAddress: string(
		required('Email address is required.'),
		email('Must be a valid email address.')
	),
	age: number(
		{round: 'floor'},
		required('Age is required.'),
		integer('Age must be a whole number.'),
		min(18, 'Must be at least 18 years old.')
	),
	homepage: string(url('Must be a valid URL.', ['http:', 'https:'])),
	fruit: string(
		{default: 'apple'},
		oneOf(
			['apple', 'orange', 'banana'],
			({values}) => `Must be ${values[0]}, ${values[1]} or ${values[2]}.`
		)
	),
	favoriteCarMakers: array(
		{default: []},
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
					'Volvo'
				],
				'Must be a known car brand.'
			)
		),
		min(2, 'Must pick at least two.'),
		max(4, 'Must pick at most four.')
	),
	startDate: date(
		minDate(now, 'Must be on or after today.'),
		maxDate(tenDaysFromNow, 'Must be at most ten days from now.')
	),
	optIn: boolean(required('Must decide to opt in or out.')),
	notRobot: number(
		required('Must enter the correct answer.'),
		exact(42, 'This is the answer.')
	),
	postalCode: string(matches(/^\d{5}$/, 'Must be a five-digit number.')),
	custom: customValidator
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
	startDate
};

suite.add('complex', done => {
	complexValidate(complexObject).then(() => done());
});

suite.run();
