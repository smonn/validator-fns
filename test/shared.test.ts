import test from 'ava';
import {exact, formatMessage, oneOf, required} from '../src/index';

test('format string message', t => {
	t.is(
		formatMessage('Hello {name}!', {
			name: 'World',
			value: '',
			field: undefined
		}),
		'Hello World!'
	);
});

test('format function message', t => {
	t.is(
		formatMessage(({name}) => `Hello ${name}!`, {
			name: 'World',
			value: '',
			field: undefined
		}),
		'Hello World!'
	);
});

test('required', async t => {
	const validate = required('required');
	t.deepEqual(await validate('hello'), {
		state: 'valid',
		value: 'hello',
		isValid: true,
		field: undefined
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
	t.deepEqual(await validate(0), {
		state: 'valid',
		value: 0,
		isValid: true,
		field: undefined
	});
	const now = new Date();
	t.deepEqual(await validate(now), {
		state: 'valid',
		value: now,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(''), {
		state: 'invalid',
		value: '',
		message: 'required',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(null), {
		state: 'invalid',
		value: null,
		message: 'required',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(undefined), {
		state: 'invalid',
		value: undefined,
		message: 'required',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	const invalidDate = new Date('');
	t.deepEqual(await validate(invalidDate), {
		state: 'invalid',
		value: invalidDate,
		message: 'required',
		isValid: false,
		field: undefined,
		errors: undefined
	});

	const nullableValidate = required('required', true);
	t.deepEqual(await nullableValidate(null), {
		state: 'valid',
		value: null,
		isValid: true,
		field: undefined
	});
});

test('exact', async t => {
	const validate = exact(5, 'exact:{exact}');
	t.deepEqual(await validate('hello'), {
		state: 'valid',
		value: 'hello',
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate('foo'), {
		state: 'invalid',
		value: 'foo',
		message: 'exact:5',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(5), {
		state: 'valid',
		value: 5,
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(4), {
		state: 'invalid',
		value: 4,
		message: 'exact:5',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	t.deepEqual(await validate(Array.from({length: 5})), {
		state: 'valid',
		value: [undefined, undefined, undefined, undefined, undefined],
		isValid: true,
		field: undefined
	});
	t.deepEqual(await validate(Array.from({length: 2})), {
		state: 'invalid',
		value: [undefined, undefined],
		message: 'exact:5',
		isValid: false,
		field: undefined,
		errors: undefined
	});
});

enum TestValue {
	One,
	Two,
	Three
}

test('enums', async t => {
	const strings = oneOf(['foo', 'bar', 'baz'], 'oneOf:{values}');
	t.deepEqual(await strings('asdf'), {
		state: 'invalid',
		value: 'asdf' as 'foo',
		message: 'oneOf:foo,bar,baz',
		isValid: false,
		field: undefined,
		errors: undefined
	});
	const numbers = oneOf([2, 4, 6], 'oneOf:{values}');
	t.deepEqual(await numbers(4), {
		state: 'valid',
		value: 4,
		isValid: true,
		field: undefined
	});
	const booleans = oneOf([false], 'oneOf:{values}');
	t.deepEqual(await booleans(false), {
		state: 'valid',
		value: false,
		isValid: true,
		field: undefined
	});
	const tsEnums = oneOf(
		[TestValue.One, TestValue.Two, TestValue.Three],
		'oneOf:{values}'
	);
	t.deepEqual(await tsEnums(TestValue.Three), {
		state: 'valid',
		value: TestValue.Three,
		isValid: true,
		field: undefined
	});
	const dates = oneOf([new Date(0), new Date(1)], 'oneOf:{values}');
	t.deepEqual(await dates(new Date(0)), {
		state: 'valid',
		value: new Date(0),
		isValid: true,
		field: undefined
	});
});
