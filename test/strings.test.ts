import test from 'ava';
import {email, max, min, required, string, url} from '../src/index';

test('min', async t => {
	const validate = min(5, 'min:{min}');
	t.deepEqual(await validate('hello'), {
		state: 'valid',
		value: 'hello',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(''), {
		state: 'valid',
		value: '',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(null), {
		state: 'valid',
		value: null,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'valid',
		value: undefined,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('foo'), {
		state: 'invalid',
		message: 'min:5',
		field: undefined,
		isValid: false,
		errors: undefined,
		value: 'foo'
	});
});

test('max', async t => {
	const validate = max(5, 'max:{max}');
	t.deepEqual(await validate('hello'), {
		state: 'valid',
		value: 'hello',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(''), {
		state: 'valid',
		value: '',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(null), {
		state: 'valid',
		value: null,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'valid',
		value: undefined,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('foo bar'), {
		state: 'invalid',
		value: 'foo bar',
		message: 'max:5',
		field: undefined,
		isValid: false,
		errors: undefined
	});
});

test('email', async t => {
	const validate = email('invalid email');
	t.deepEqual(await validate('name@example.com'), {
		state: 'valid',
		value: 'name@example.com',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('name@host'), {
		state: 'valid',
		value: 'name@host',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('name+tag@example.com'), {
		state: 'valid',
		value: 'name+tag@example.com',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(''), {
		state: 'valid',
		value: '',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(null), {
		state: 'valid',
		value: null,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'valid',
		value: undefined,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('@example.com'), {
		state: 'invalid',
		isValid: false,
		field: undefined,
		errors: undefined,
		value: '@example.com',
		message: 'invalid email'
	});
	t.deepEqual(await validate('name.com'), {
		state: 'invalid',
		isValid: false,
		field: undefined,
		errors: undefined,
		value: 'name.com',
		message: 'invalid email'
	});
	t.deepEqual(await validate('name@.com'), {
		state: 'invalid',
		isValid: false,
		field: undefined,
		errors: undefined,
		value: 'name@.com',
		message: 'invalid email'
	});
});

test('url', async t => {
	const validate = url('invalid url', ['http:', 'mailto:', 'https:']);
	t.deepEqual(await validate('http://example.com'), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: 'http://example.com'
	});
	t.deepEqual(await validate('mailto:name@example.com'), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: 'mailto:name@example.com'
	});
	t.deepEqual(await validate(''), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: ''
	});
	t.deepEqual(await validate(null), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: null
	});
	t.deepEqual(await validate(undefined), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: undefined
	});
	t.deepEqual(await validate(0), {
		state: 'invalid',
		isValid: false,
		field: undefined,
		errors: undefined,
		value: 0 as unknown as string,
		message: 'invalid url'
	});
	t.deepEqual(await validate('/foo'), {
		state: 'invalid',
		isValid: false,
		field: undefined,
		errors: undefined,
		value: '/foo',
		message: 'invalid url'
	});
	t.deepEqual(await validate('unknown://path'), {
		state: 'invalid',
		isValid: false,
		field: undefined,
		value: 'unknown://path',
		errors: undefined,
		message: 'invalid url'
	});
});

test('string', async t => {
	const validate = string(
		{trim: true},
		required('Must enter a value.'),
		min(5, 'At least five characters.'),
		max(10, 'At most ten characters.')
	);

	t.deepEqual(await validate('hello'), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: 'hello'
	});
	t.deepEqual(await validate(12_345), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: '12345'
	});
	t.deepEqual(await validate('  test  '), {
		state: 'invalid',
		message: 'At least five characters.',
		value: 'test',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate('hello world'), {
		state: 'invalid',
		message: 'At most ten characters.',
		value: 'hello world',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(''), {
		state: 'invalid',
		message: 'Must enter a value.',
		value: '',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(new Date(0)), {
		state: 'invalid',
		message: 'At most ten characters.',
		value: '1970-01-01T00:00:00.000Z',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'invalid',
		message: 'Must enter a value.',
		value: undefined,
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(null), {
		state: 'invalid',
		message: 'Must enter a value.',
		value: null,
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate({name: 'August'}), {
		state: 'invalid',
		message: 'Failed to parse value to string.',
		value: {name: 'August'} as unknown as string,
		isValid: false,
		field: undefined,
		errors: undefined
	});
});

test('string default', async t => {
	const validate = string({default: 'hello'});
	t.deepEqual(await validate(undefined), {
		state: 'valid',
		isValid: true,
		field: undefined,
		value: 'hello'
	});
});
