import { formatMessage, required, exact, oneOf } from '../src/shared';

test('format string message', () => {
  expect(
    formatMessage('Hello {name}!', {
      name: 'World',
      value: '',
      field: undefined,
    })
  ).toBe('Hello World!');
});

test('format function message', () => {
  expect(
    formatMessage(({ name }) => `Hello ${name}!`, {
      name: 'World',
      value: '',
      field: undefined,
    })
  ).toBe('Hello World!');
});

test('required', async () => {
  const validate = required('required');
  await expect(validate('hello')).resolves.toMatchObject({
    state: 'valid',
    value: 'hello',
  });
  await expect(validate(true)).resolves.toMatchObject({
    state: 'valid',
    value: true,
  });
  await expect(validate(false)).resolves.toMatchObject({
    state: 'valid',
    value: false,
  });
  await expect(validate(0)).resolves.toMatchObject({
    state: 'valid',
    value: 0,
  });
  const now = new Date();
  await expect(validate(now)).resolves.toMatchObject({
    state: 'valid',
    value: now,
  });
  await expect(validate('')).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: '',
    message: 'required',
  });
  await expect(validate(null)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: null,
    message: 'required',
  });
  await expect(validate(undefined)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: undefined,
    message: 'required',
  });
  const invalidDate = new Date('');
  await expect(validate(invalidDate)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: invalidDate,
    message: 'required',
  });

  const nullableValidate = required('required', true);
  await expect(nullableValidate(null)).resolves.toMatchObject({
    state: 'valid',
    value: null,
  });
});

test('exact', async () => {
  const validate = exact(5, 'exact:{exact}');
  await expect(validate('hello')).resolves.toMatchObject({
    state: 'valid',
    value: 'hello',
  });
  await expect(validate('foo')).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: 'foo',
    message: 'exact:5',
  });
  await expect(validate(5)).resolves.toMatchObject({
    state: 'valid',
    value: 5,
  });
  await expect(validate(4)).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: 4,
    message: 'exact:5',
  });
  await expect(validate(Array(5))).resolves.toMatchObject({
    state: 'valid',
    value: [undefined, undefined, undefined, undefined, undefined],
  });
  await expect(validate(Array(2))).resolves.toMatchObject({
    state: 'invalid',
    errors: null,
    value: [undefined, undefined],
    message: 'exact:5',
  });
});

enum TestValue {
  One,
  Two,
  Three,
}

test('enums', async () => {
  const strings = oneOf(['foo', 'bar', 'baz'], 'oneOf:{values}');
  await expect(strings(('asdf' as unknown) as 'foo')).resolves.toMatchObject({
    state: 'invalid',
    value: 'asdf',
    message: 'oneOf:foo,bar,baz',
  });
  const numbers = oneOf([2, 4, 6], 'oneOf:{values}');
  await expect(numbers(4)).resolves.toMatchObject({
    state: 'valid',
    value: 4,
  });
  const booleans = oneOf([false], 'oneOf:{values}');
  await expect(booleans(false)).resolves.toMatchObject({
    state: 'valid',
    value: false,
  });
  const tsEnums = oneOf(
    [TestValue.One, TestValue.Two, TestValue.Three],
    'oneOf:{values}'
  );
  await expect(tsEnums(TestValue.Three)).resolves.toMatchObject({
    state: 'valid',
    value: TestValue.Three,
  });
  const dates = oneOf([new Date(0), new Date(1)], 'oneOf:{values}');
  await expect(dates(new Date(0))).resolves.toMatchObject({
    state: 'valid',
    value: new Date(0),
  });
});
