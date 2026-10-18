import { assert, test } from 'vitest';
import {
  array,
  max,
  messageTree,
  min,
  object,
  optional,
  string,
  transform,
  valid,
  type Validator,
} from '../src/index.js';

test('array', async () => {
  const validate = array(
    string(min(3, 'min:{min}')),
    { messages: { required: 'required' } },
    min(1, 'min:{min}'),
  );
  assert.deepEqual(await validate(['foo', 'bar', 'baz']), {
    state: 'valid',
    value: ['foo', 'bar', 'baz'],
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    code: 'required',
    params: {},
    message: 'required',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate([]), {
    state: 'invalid',
    code: 'min',
    params: { min: 1, amount: 0 },
    message: 'min:1',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    code: 'type',
    params: { expected: 'array' },
    message: 'type',
    errors: undefined,
    field: undefined,
  });
  assert.deepInclude(await validate({}), { code: 'type' });
  assert.deepInclude(await validate(['foo', 'ba']), {
    state: 'invalid',
    code: 'items',
    params: {},
    message: 'items',
    field: undefined,
  });
  assert.deepEqual(messageTree(await validate(['foo', 'ba'])), [null, 'min:3']);
});

test('array with object', async () => {
  const validate = array(
    object({
      username: string(
        { messages: { required: 'required' } },
        min(3, 'min:{min}'),
      ),
    }),
    min(2, 'min:{min}'),
    max(10, 'max:{max}'),
  );
  assert.deepEqual(
    messageTree(await validate([{}, { username: 'foo' }, { username: 'ab' }])),
    [{ username: 'required' }, null, { username: 'min:3' }],
  );
});

test('array default', async () => {
  const validate = array(string(min(5, 'min:{min}')), { default: ['hello'] });
  assert.deepEqual(await validate(), {
    state: 'valid',
    value: ['hello'],
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'valid',
    value: ['hello'],
    field: undefined,
  });
  assert.deepEqual(await validate([]), {
    state: 'valid',
    value: [],
    field: undefined,
  });
  assert.deepEqual(await validate(['other']), {
    state: 'valid',
    value: ['other'],
    field: undefined,
  });
});

test('array without validation', async () => {
  const validate = array();
  assert.deepEqual(await validate([]), {
    state: 'valid',
    value: [],
    field: undefined,
  });
  assert.deepEqual(await optional(validate)(), {
    state: 'valid',
    value: undefined,
    field: undefined,
  });
});

test('array item field names', async () => {
  const fields: (string | undefined)[] = [];
  const recordField: Validator = (value, field) => {
    fields.push(field);
    return valid({ value, field });
  };

  await array(recordField)(['a', 'b']);
  assert.deepEqual(fields, ['[0]', '[1]']);

  fields.length = 0;
  await array(recordField)(['a', 'b'], 'tags');
  assert.deepEqual(fields, ['tags[0]', 'tags[1]']);

  fields.length = 0;
  await object({ tags: array(recordField) })({ tags: ['a', 'b'] });
  assert.deepEqual(fields, ['tags[0]', 'tags[1]']);
});

test('should return the parsed items when the item validator parses', async () => {
  const validate = array(
    string({
      parser: async (value, field) => valid({ value: String(value), field }),
    }),
  );

  assert.deepEqual(await validate([1, 2.5]), {
    state: 'valid',
    field: undefined,
    value: ['1', '2.5'],
  });
});

test('should return the transformed items when the item validator transforms', async () => {
  const validate = array(string(transform((value) => value.trim())));

  assert.deepEqual(await validate([' a ', 'b ']), {
    state: 'valid',
    field: undefined,
    value: ['a', 'b'],
  });
});

test('array() takes an array test right after the item validator', async () => {
  const validate = array(string(), max(1, 'max:{max}'), min(1, 'min:{min}'));
  assert.deepEqual(await validate(['a']), {
    state: 'valid',
    value: ['a'],
    field: undefined,
  });
  assert.deepInclude(await validate(['a', 'b']), {
    state: 'invalid',
    message: 'max:1',
  });
});

test('array() without an item validator takes only a config', async () => {
  const validate = array({ messages: { required: 'Pick some.' } });
  assert.deepEqual(await validate(['a', 1]), {
    state: 'valid',
    value: ['a', 1],
    field: undefined,
  });
  assert.deepInclude(await validate(null), { message: 'Pick some.' });
});

test('array() rejects the 2.x order, config before the item validator', () => {
  // JavaScript callers can still pass it; TypeScript rejects it.
  assert.throws(
    () => Reflect.apply(array, undefined, [{ default: [] }, string()]),
    TypeError,
    'array(item, config?, ...tests)',
  );
});
