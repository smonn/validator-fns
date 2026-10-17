import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  email,
  matches,
  max,
  min,
  parseString,
  string,
  url,
  uuid,
  type ValidatorTest,
} from '../src/index';

// Tests called directly here are typed as plain ValidatorTest: a built-in test
// passes a missing value through, which its value type leaves out, since type
// validators only run tests on present values.

test('min', async () => {
  const validate: ValidatorTest = min(5, 'min:{min}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate('foo'), {
    state: 'invalid',
    message: 'min:5',
    field: undefined,
    errors: undefined,
    value: 'foo',
  });
});

test('max', async () => {
  const validate: ValidatorTest = max(5, 'max:{max}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate('foo bar'), {
    state: 'invalid',
    value: 'foo bar',
    message: 'max:5',
    field: undefined,
    errors: undefined,
  });
});

test('email', async () => {
  const validate: ValidatorTest = email('invalid email');
  assert.deepEqual(await validate('name@example.com'), {
    state: 'valid',
    value: 'name@example.com',
    field: undefined,
  });
  assert.deepEqual(await validate('name@host'), {
    state: 'valid',
    value: 'name@host',
    field: undefined,
  });
  assert.deepEqual(await validate('name+tag@example.com'), {
    state: 'valid',
    value: 'name+tag@example.com',
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate('@example.com'), {
    state: 'invalid',
    field: undefined,
    errors: undefined,
    value: '@example.com',
    message: 'invalid email',
  });
  assert.deepEqual(await validate('name.com'), {
    state: 'invalid',
    field: undefined,
    errors: undefined,
    value: 'name.com',
    message: 'invalid email',
  });
  assert.deepEqual(await validate('name@.com'), {
    state: 'invalid',
    field: undefined,
    errors: undefined,
    value: 'name@.com',
    message: 'invalid email',
  });
});

test('url', async () => {
  const validate: ValidatorTest = url('invalid url', [
    'http:',
    'mailto:',
    'https:',
  ]);
  assert.deepEqual(await validate('http://example.com'), {
    state: 'valid',
    field: undefined,
    value: 'http://example.com',
  });
  assert.deepEqual(await validate('mailto:name@example.com'), {
    state: 'valid',
    field: undefined,
    value: 'mailto:name@example.com',
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    field: undefined,
    value: '',
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    field: undefined,
    value: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    field: undefined,
    value: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
    field: undefined,
    errors: undefined,
    value: 0 as unknown as string,
    message: 'invalid url',
  });
  assert.deepEqual(await validate('/foo'), {
    state: 'invalid',
    field: undefined,
    errors: undefined,
    value: '/foo',
    message: 'invalid url',
  });
  assert.deepEqual(await validate('unknown://path'), {
    state: 'invalid',
    field: undefined,
    value: 'unknown://path',
    errors: undefined,
    message: 'invalid url',
  });
});

test('url allows only http: and https: by default', async () => {
  const validate = url('invalid url');
  for (const value of ['http://example.com', 'https://example.com/path']) {
    assert.equal((await validate(value)).state, 'valid', value);
  }
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:name@example.com',
    'ftp://example.com',
  ]) {
    assert.equal((await validate(value)).state, 'invalid', value);
  }
});

test('url protocols replace the default', async () => {
  const validate = url('invalid url', ['mailto:']);
  assert.equal((await validate('mailto:name@example.com')).state, 'valid');
  assert.equal((await validate('https://example.com')).state, 'invalid');
});

test('url passes the default protocols to the message', async () => {
  const validate = url('Use {protocols}.');
  const result = await validate('mailto:name@example.com');
  assert.equal(
    result.state === 'invalid' && result.message,
    'Use http:,https:.',
  );
});

test('string', async () => {
  const validate = string(
    { trim: true, requiredMessage: 'Must enter a value.' },
    min(5, 'At least five characters.'),
    max(10, 'At most ten characters.'),
  );

  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(12_345), {
    state: 'valid',
    field: undefined,
    value: '12345',
  });
  assert.deepEqual(await validate('  test  '), {
    state: 'invalid',
    message: 'At least five characters.',
    value: 'test',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate('hello world'), {
    state: 'invalid',
    message: 'At most ten characters.',
    value: 'hello world',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: '',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(new Date(0)), {
    state: 'invalid',
    message: 'At most ten characters.',
    value: '1970-01-01T00:00:00.000Z',
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate({ name: 'August' }), {
    state: 'invalid',
    message: 'Failed to parse value to string.',
    value: { name: 'August' } as unknown as string,
    field: undefined,
    errors: undefined,
  });
});

test('string default', async () => {
  const validate = string({ default: 'hello' });
  assert.deepEqual(await validate(), {
    state: 'valid',
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate('other'), {
    state: 'valid',
    field: undefined,
    value: 'other',
  });
  // Will cast 123 to '123'
  assert.deepEqual(await validate(123), {
    state: 'valid',
    field: undefined,
    value: '123',
  });
  // Will cast 0 to '0'
  assert.deepEqual(await validate(0), {
    state: 'valid',
    field: undefined,
    value: '0',
  });
  // Will cast false to 'false'
  assert.deepEqual(await validate(false), {
    state: 'valid',
    field: undefined,
    value: 'false',
  });
});

test('should pass each matching value when the pattern has the global flag', async () => {
  const validate = matches(/a/g, 'invalid');
  assert.equal((await validate('ab')).state, 'valid');
  assert.equal((await validate('a')).state, 'valid');
});

test('should pass each matching value when the pattern has the sticky flag', async () => {
  const validate = matches(/a/y, 'invalid');
  assert.equal((await validate('a')).state, 'valid');
  assert.equal((await validate('a')).state, 'valid');
});

test('should match from the start when the pattern has the sticky flag', async () => {
  const validate = matches(/a/y, 'invalid');
  assert.equal((await validate('ba')).state, 'invalid');
});

test('should leave lastIndex unchanged when testing the caller pattern', async () => {
  const pattern = /a/g;
  const validate = matches(pattern, 'invalid');
  await validate('ab');
  assert.equal(pattern.lastIndex, 0);
});

test('uuid', async () => {
  const validate: ValidatorTest = uuid('invalid uuid');
  const validValues = [
    // One per RFC 9562 version, 1 to 8, from the RFC's examples where it has one.
    'c232ab00-9414-11ec-b3c8-9f6bdeced846',
    '000003e8-cbb9-21ea-b201-00045a86c8a1',
    '5df41881-3aed-3515-88a7-2f4a814cf09e',
    '919108f7-52d1-4320-9bac-f847db4148a8',
    '2ed6657d-e927-568b-95e1-2665a8aea6a2',
    '1ec9414c-232a-6b00-b3c8-9f6bdeced846',
    '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
    '2489e9ad-2ee2-8e00-8ec9-32d5f69181c0',
    // Nil and max.
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    // Uppercase.
    '919108F7-52D1-4320-9BAC-F847DB4148A8',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
    '',
    null,
    undefined,
  ];
  for (const value of validValues) {
    assert.deepEqual(
      await validate(value),
      { state: 'valid', field: undefined, value },
      String(value),
    );
  }

  const invalidValues = [
    // Braces and missing hyphens.
    '{919108f7-52d1-4320-9bac-f847db4148a8}',
    '919108f752d143209bacf847db4148a8',
    // Versions 0 and 9 outside nil.
    '919108f7-52d1-0320-9bac-f847db4148a8',
    '919108f7-52d1-9320-9bac-f847db4148a8',
    // Variants other than RFC 9562's 10xx.
    '919108f7-52d1-4320-7bac-f847db4148a8',
    '919108f7-52d1-4320-cbac-f847db4148a8',
    // Wrong length, non-hex, surrounding text.
    '919108f7-52d1-4320-9bac-f847db4148a',
    '919108f7-52d1-4320-9bac-f847db4148a8a',
    '919108g7-52d1-4320-9bac-f847db4148a8',
    ' 919108f7-52d1-4320-9bac-f847db4148a8',
    'id:919108f7-52d1-4320-9bac-f847db4148a8',
    'urn:uuid:919108f7-52d1-4320-9bac-f847db4148a8',
    0,
  ];
  for (const value of invalidValues) {
    assert.deepEqual(
      await validate(value),
      {
        state: 'invalid',
        field: undefined,
        errors: undefined,
        value,
        message: 'invalid uuid',
      },
      String(value),
    );
  }
});

test('string accepts primitives, dates, and boxed primitives', async () => {
  const date = new Date('2020-01-02T03:04:05.000Z');
  const accepted: [unknown, string][] = [
    [1, '1'],
    [1n, '1'],
    [true, 'true'],
    [new String('x'), 'x'],
    [new Number(3), '3'],
    [new Boolean(false), 'false'],
    [runInNewContext('new String("y")'), 'y'],
    [date, '2020-01-02T03:04:05.000Z'],
  ];
  const validate = string();
  for (const [value, expected] of accepted) {
    assert.equal(parseString(value), expected, expected);
    const result = await validate(value);
    assert.equal(result.state, 'valid', expected);
    assert.equal(result.value, expected, expected);
  }
});

test('string returns an invalid result for non-primitive and symbol input', async () => {
  class Point {
    x = 1;
  }
  const rejected: [unknown, string][] = [
    [[1], 'array'],
    [[], 'empty array'],
    [new Map(), 'Map'],
    [new Set([1]), 'Set'],
    [() => 1, 'function'],
    [/re/, 'RegExp'],
    [{}, 'plain object'],
    [Object.create(null), 'null-prototype object'],
    [new Point(), 'class instance'],
    [{ [Symbol.toStringTag]: 'String' }, 'object tagged String'],
    [Symbol('s'), 'symbol'],
  ];
  const validate = string();
  for (const [value, label] of rejected) {
    assert.throws(
      () => parseString(value),
      TypeError,
      'Failed to parse value to string.',
      label,
    );
    const result = await validate(value);
    assert.equal(result.state, 'invalid', label);
    assert.equal(
      result.state === 'invalid' && result.message,
      'Failed to parse value to string.',
      label,
    );
    assert.equal(result.value, value, label);
  }
});
