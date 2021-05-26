import test from 'ava';
import {boolean, required} from '../src/index';

test('boolean', async t => {
	const validate = boolean(required('required'));
	const validateWithDefault = boolean({default: true});

	t.deepEqual(await validate(null), {
		state: 'invalid',
		message: 'required',
		value: null,
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'invalid',
		message: 'required',
		value: undefined,
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(true), {
		state: 'valid',
		value: true,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(false), {
		state: 'valid',
		value: false,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('true'), {
		state: 'valid',
		value: true,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('false'), {
		state: 'valid',
		value: true,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(1), {
		state: 'valid',
		value: true,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(0), {
		state: 'valid',
		value: false,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate({}), {
		state: 'valid',
		value: true,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validateWithDefault(undefined), {
		state: 'valid',
		value: true,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validateWithDefault(null), {
		state: 'valid',
		value: null,
		isValid: true,
		field: undefined
	});
});
