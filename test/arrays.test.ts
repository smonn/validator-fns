import {test} from 'uvu';
import * as assert from 'uvu/assert';
import {array, max, min, object, required, string} from '../src/index';

test('array', async () => {
	const validate = array(
		string(min(3, 'min:{min}')),
		required('required'),
		min(1, 'min:{min}')
	);
	assert.equal(await validate(['foo', 'bar', 'baz']), {
		state: 'valid',
		value: ['foo', 'bar', 'baz'],
		isValid: true,
		field: undefined
	});
	assert.equal(await validate(null), {
		state: 'invalid',
		value: null,
		message: 'required',
		errors: [],
		isValid: false,
		field: undefined
	});
	assert.equal(await validate(undefined), {
		state: 'invalid',
		value: undefined,
		message: 'required',
		errors: [],
		isValid: false,
		field: undefined
	});
	assert.equal(await validate([]), {
		state: 'invalid',
		value: [],
		message: 'min:1',
		errors: [],
		isValid: false,
		field: undefined
	});
	assert.equal(await validate(''), {
		state: 'invalid',
		value: '',
		message: 'min:1',
		errors: [],
		isValid: false,
		field: undefined
	});
	assert.equal(await validate({}), {
		state: 'invalid',
		value: {},
		message: 'min:1',
		errors: [],
		isValid: false,
		field: undefined
	});
	assert.equal(await validate(['foo', 'ba']), {
		state: 'invalid',
		value: ['foo', 'ba'],
		message: '',
		errors: [
			{
				message: 'min:3',
				index: 1,
				errors: undefined
			}
		],
		isValid: false,
		field: undefined
	});
});

test('array with object', async () => {
	const validate = array(
		object({
			username: string(required('required'), min(3, 'min:{min}'))
		}),
		min(2, 'min:{min}'),
		max(10, 'max:{max}')
	);
	assert.equal(await validate([{}, {username: 'foo'}, {username: 'ab'}]), {
		state: 'invalid',
		value: [{}, {username: 'foo'}, {username: 'ab'}],
		message: '',
		errors: [
			{
				index: 0,
				message: '',
				errors: {
					username: 'required'
				}
			},
			{
				index: 2,
				message: '',
				errors: {
					username: 'min:3'
				}
			}
		],
		isValid: false,
		field: undefined
	});
});

test('nested array', async () => {
	// While this is technically possible, it's not recommended usage as it quickly gets quite complex
	const validate = array(array(string(required('required'))));
	assert.equal(await validate([['', 'foo', null]]), {
		state: 'invalid',
		message: '',
		value: [['', 'foo', null]],
		errors: [
			{
				index: 0,
				message: '',
				errors: [
					{
						index: 0,
						message: 'required',
						errors: undefined
					},
					{
						index: 2,
						message: 'required',
						errors: undefined
					}
				]
			}
		],
		isValid: false,
		field: undefined
	});
});

test('array default', async () => {
	const validate = array({default: ['hello']}, string(min(5, 'min:{min}')));
	assert.equal(await validate(undefined), {
		state: 'valid',
		value: ['hello'],
		isValid: true,
		field: undefined
	});
});

test('array without validation', async () => {
	const validate = array();
	assert.equal(await validate([]), {
		state: 'valid',
		value: [],
		isValid: true,
		field: undefined
	});
	assert.equal(await validate(undefined), {
		state: 'valid',
		value: undefined,
		isValid: true,
		field: undefined
	});
});

test.run();
