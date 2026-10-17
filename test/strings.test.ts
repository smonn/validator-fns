import { assert, test } from 'vitest';
import {
  email,
  matches,
  max,
  min,
  parseString,
  required,
  string,
  url,
  uuid,
} from '../src/index';

test('min', async () => {
  const validate = min(5, 'min:{min}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('foo'), {
    state: 'invalid',
    message: 'min:5',
    field: undefined,
    isValid: false,
    errors: undefined,
    value: 'foo',
  });
});

test('max', async () => {
  const validate = max(5, 'max:{max}');
  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    value: 'hello',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('foo bar'), {
    state: 'invalid',
    value: 'foo bar',
    message: 'max:5',
    field: undefined,
    isValid: false,
    errors: undefined,
  });
});

test('email', async () => {
  const validate = email('invalid email');
  assert.deepEqual(await validate('name@example.com'), {
    state: 'valid',
    value: 'name@example.com',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('name@host'), {
    state: 'valid',
    value: 'name@host',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('name+tag@example.com'), {
    state: 'valid',
    value: 'name+tag@example.com',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    value: '',
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: undefined,
    isValid: true,
    field: undefined,
  });
  assert.deepEqual(await validate('@example.com'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: '@example.com',
    message: 'invalid email',
  });
  assert.deepEqual(await validate('name.com'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: 'name.com',
    message: 'invalid email',
  });
  assert.deepEqual(await validate('name@.com'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: 'name@.com',
    message: 'invalid email',
  });
});

test('url', async () => {
  const validate = url('invalid url', ['http:', 'mailto:', 'https:']);
  assert.deepEqual(await validate('http://example.com'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'http://example.com',
  });
  assert.deepEqual(await validate('mailto:name@example.com'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'mailto:name@example.com',
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '',
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: undefined,
  });
  assert.deepEqual(await validate(0), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: 0 as unknown as string,
    message: 'invalid url',
  });
  assert.deepEqual(await validate('/foo'), {
    state: 'invalid',
    isValid: false,
    field: undefined,
    errors: undefined,
    value: '/foo',
    message: 'invalid url',
  });
  assert.deepEqual(await validate('unknown://path'), {
    state: 'invalid',
    isValid: false,
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
    { trim: true },
    required('Must enter a value.'),
    min(5, 'At least five characters.'),
    max(10, 'At most ten characters.'),
  );

  assert.deepEqual(await validate('hello'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(12_345), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '12345',
  });
  assert.deepEqual(await validate('  test  '), {
    state: 'invalid',
    message: 'At least five characters.',
    value: 'test',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate('hello world'), {
    state: 'invalid',
    message: 'At most ten characters.',
    value: 'hello world',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: '',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(new Date(0)), {
    state: 'invalid',
    message: 'At most ten characters.',
    value: '1970-01-01T00:00:00.000Z',
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'Must enter a value.',
    value: undefined,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
  assert.deepEqual(await validate({ name: 'August' }), {
    state: 'invalid',
    message: 'Failed to parse value to string.',
    value: { name: 'August' } as unknown as string,
    isValid: false,
    field: undefined,
    errors: undefined,
  });
});

test('string default', async () => {
  const validate = string({ default: 'hello' });
  assert.deepEqual(await validate(), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate(''), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'hello',
  });
  assert.deepEqual(await validate('other'), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: 'other',
  });
  // Will cast 123 to '123'
  assert.deepEqual(await validate(123), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '123',
  });
  // Will cast 0 to '0'
  assert.deepEqual(await validate(0), {
    state: 'valid',
    isValid: true,
    field: undefined,
    value: '0',
  });
  // Will cast false to 'false'
  assert.deepEqual(await validate(false), {
    state: 'valid',
    isValid: true,
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
  const validate = uuid('invalid uuid');
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
      { state: 'valid', isValid: true, field: undefined, value },
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
        isValid: false,
        field: undefined,
        errors: undefined,
        value,
        message: 'invalid uuid',
      },
      String(value),
    );
  }
});

// Pins today's coercion of non-primitive input. #579 changes it in v3 to
// return an invalid result instead.
test('string coerces non-primitive input other than plain objects', async () => {
  const coerced: [unknown, string][] = [
    [[1], '1'],
    [[], ''],
    [['a', 'b'], 'a,b'],
    [new Map(), '[object Map]'],
    [new Set([1]), '[object Set]'],
    [Symbol('s'), 'Symbol(s)'],
    [1n, '1'],
    [true, 'true'],
    [() => 1, '() => 1'],
    [new String('x'), 'x'],
    [/re/, '/re/'],
  ];
  const validate = string();
  for (const [value, expected] of coerced) {
    assert.equal(parseString(value), expected, expected);
    assert.deepEqual(
      await validate(value),
      { state: 'valid', isValid: true, field: undefined, value: expected },
      expected,
    );
  }

  class Point {
    x = 1;
  }
  for (const value of [{}, Object.create(null), new Point()]) {
    assert.throws(
      () => parseString(value),
      TypeError,
      'Failed to parse value to string.',
    );
    assert.deepEqual(await validate(value), {
      state: 'invalid',
      isValid: false,
      field: undefined,
      value: value as string,
      message: 'Failed to parse value to string.',
      errors: undefined,
    });
  }
});
