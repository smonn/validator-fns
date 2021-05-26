import test from 'ava';
import {
	integer,
	max,
	min,
	number,
	object,
	required,
	string,
	ValidatorTest
} from '../src/index.js';

test('object', async t => {
	const validate = object({
		username: string(
			required('Username is required.'),
			min(5, 'At least five characters.'),
			max(20, 'At most 20 characters.')
		),
		age: number(
			required('Must enter your age.'),
			min(18, 'At least 18 years old'),
			max(150, 'Are you really over 150 years old?'),
			integer('Half-years do not count.')
		)
	});

	t.deepEqual(
		await validate({
			username: 'hello',
			age: '20'
		}),
		{
			state: 'valid',
			value: {
				username: 'hello',
				age: 20
			},
			isValid: true,
			field: undefined
		}
	);

	t.deepEqual(
		await validate({
			username: 'hello',
			age: null
		}),
		{
			state: 'invalid',
			isValid: false,
			field: undefined,
			message: '',
			value: {
				username: 'hello',
				age: null
			},
			errors: {
				age: 'Must enter your age.'
			}
		}
	);
});

test('empty object config is always valid', async t => {
	const validate = object({});

	t.deepEqual(await validate({foo: 'bar'}), {
		state: 'valid',
		value: {},
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(null), {
		state: 'valid',
		value: {},
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'valid',
		value: {},
		isValid: true,
		field: undefined
	});
});

test('nested object', async t => {
	// While this is technically possible, it's not recommended usage as it quickly gets quite complex
	const validate = object({
		person: object({
			firstName: string(required('required')),
			lastName: string(required('required')),
			age: number()
		})
	});

	t.deepEqual(
		await validate({
			person: {
				firstName: 'foo',
				lastName: 'bar'
			}
		}),
		{
			state: 'valid',
			value: {
				person: {
					firstName: 'foo',
					lastName: 'bar',
					age: undefined
				}
			},
			isValid: true,
			field: undefined
		}
	);

	t.deepEqual(
		await validate({
			person: {
				firstName: 'foo',
				age: '22'
			}
		}),
		{
			state: 'invalid',
			message: '',
			value: {
				person: {
					firstName: 'foo',
					age: '22'
				}
			},
			errors: {
				person: {
					lastName: 'required'
				}
			},
			isValid: false,
			field: undefined
		}
	);
});

test('invalid configuration', async t => {
	const config: Record<string, ValidatorTest> = 'bad value' as any as Record<
	string,
	ValidatorTest
	>;
	t.throws(() => object(config));

	const validate = object({test: 'test'} as any);
	await validate(null);
});
