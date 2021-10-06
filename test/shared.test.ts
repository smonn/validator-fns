import {test} from 'uvu';
import * as assert from 'uvu/assert';
import {exact, formatMessage, oneOf, required} from '../src/index';

test('format string message', () => {
  assert.is(
    formatMessage('Hello {name}!', {
      name: 'World',
      value: '',
      field: undefined,
    }),
    'Hello World!',
  );
});

test('format function message', () => {
  assert.is(
    formatMessage(({name}) => `Hello ${name}!`, {
      name: 'World',
      value: '',
      field: undefined,
    }),
    'Hello World!',
  );
});

test('required', async () => {
  const validate = required('required');
  assert.equal(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(true), {
    state: 'valid',
    value: true,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(false), {
    state: 'valid',
    value: false,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(0), {
    state: 'valid',
    value: 0,
    isValid: true,
    field: undefined,
  });
  const now = new Date();
  assert.equal(await validate(now), {
    state: 'valid',
    value: now,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(''), {
    state: 'invalid',
    value: '',
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(null), {
    state: 'invalid',
    value: null,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(undefined), {
    state: 'invalid',
    value: undefined,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  const invalidDate = new Date('');
  assert.equal(await validate(invalidDate), {
    state: 'invalid',
    value: invalidDate,
    message: 'required',
    isValid: false,
    field: undefined,
    errors: undefined,
  });

  const nullableValidate = required('required', true);
  assert.equal(await nullableValidate(null), {
    state: 'valid',
    value: null,
    isValid: true,
    field: undefined,
  });
});

test('exact', async () => {
  const validate = exact(5, 'exact:{exact}');
  assert.equal(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate('foo'), {
    state: 'invalid',
    value: 'foo',
    message: 'exact:5',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(5), {
    state: 'valid',
    value: 5,
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(4), {
    state: 'invalid',
    value: 4,
    message: 'exact:5',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.equal(await validate(Array.from({length: 5})), {
    state: 'valid',
    value: [undefined, undefined, undefined, undefined, undefined],
    isValid: true,
    field: undefined,
  });
  assert.equal(await validate(Array.from({length: 2})), {
    state: 'invalid',
    value: [undefined, undefined],
    message: 'exact:5',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
});

enum TestValue {
  One,
  Two,
  Three,
}

test('enums', async () => {
  const strings = oneOf(['foo', 'bar', 'baz'], 'oneOf:{values}');
  assert.equal(await strings('asdf'), {
    state: 'invalid',
    value: 'asdf' as 'foo',
    message: 'oneOf:foo,bar,baz',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  const numbers = oneOf([2, 4, 6], 'oneOf:{values}');
  assert.equal(await numbers(4), {
    state: 'valid',
    value: 4,
    isValid: true,
    field: undefined,
  });
  const booleans = oneOf([false], 'oneOf:{values}');
  assert.equal(await booleans(false), {
    state: 'valid',
    value: false,
    isValid: true,
    field: undefined,
  });
  const tsEnums = oneOf(
    [TestValue.One, TestValue.Two, TestValue.Three],
    'oneOf:{values}',
  );
  assert.equal(await tsEnums(TestValue.Three), {
    state: 'valid',
    value: TestValue.Three,
    isValid: true,
    field: undefined,
  });
  const dates = oneOf([new Date(0), new Date(1)], 'oneOf:{values}');
  assert.equal(await dates(new Date(0)), {
    state: 'valid',
    value: new Date(0),
    isValid: true,
    field: undefined,
  });
});

test.run();
