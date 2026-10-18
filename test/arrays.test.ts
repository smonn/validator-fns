import { assert, test } from 'vitest';
import {
  array,
  invalid,
  max,
  min,
  number,
  object,
  optional,
  string,
  valid,
  type Validator,
} from '../src/index.js';

test('array', async () => {
  const validate = array(
    string(min(3, 'min:{min}')),
    { requiredMessage: 'required' },
    min(1, 'min:{min}'),
  );
  assert.deepEqual(await validate(['foo', 'bar', 'baz']), {
    state: 'valid',
    value: ['foo', 'bar', 'baz'],
    field: undefined,
  });
  assert.deepEqual(await validate(null), {
    state: 'invalid',
    message: 'required',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate(), {
    state: 'invalid',
    message: 'required',
    errors: undefined,
    field: undefined,
  });
  assert.deepEqual(await validate([]), {
    state: 'invalid',
    message: 'min:1',
    errors: [],
    field: undefined,
  });
  assert.deepEqual(await validate(''), {
    state: 'invalid',
    message: 'min:1',
    errors: [],
    field: undefined,
  });
  assert.deepEqual(await validate({}), {
    state: 'invalid',
    message: 'min:1',
    errors: [],
    field: undefined,
  });
  assert.deepEqual(await validate(['foo', 'ba']), {
    state: 'invalid',
    message: '',
    errors: [null, 'min:3'],
    field: undefined,
  });
});

test('array with object', async () => {
  const validate = array(
    object({
      username: string({ requiredMessage: 'required' }, min(3, 'min:{min}')),
    }),
    min(2, 'min:{min}'),
    max(10, 'max:{max}'),
  );
  assert.deepEqual(
    await validate([{}, { username: 'foo' }, { username: 'ab' }]),
    {
      state: 'invalid',
      message: '',
      errors: [
        {
          username: 'required',
        },
        null,
        {
          username: 'min:3',
        },
      ],
      field: undefined,
    },
  );
});

test('nested array', async () => {
  // While this is technically possible, it's not recommended usage as it quickly gets quite complex
  const validate = array(array(string({ requiredMessage: 'required' })));
  assert.deepEqual(await validate([['', 'foo', null]]), {
    state: 'invalid',
    message: '',
    errors: [['required', null, 'required']],
    field: undefined,
  });
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
    value: ['hello'],
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

// Fails with an empty message and no errors, which built-in tests never do.
const silent: Validator = async (value, field) =>
  invalid({ message: '', value, field });

test('array records an empty message for an item that fails without one', async () => {
  const result = await array(silent)(['a', 'b']);
  assert.equal(result.state, 'invalid');
  assert.deepEqual(result.state === 'invalid' && result.errors, ['', '']);
});

test('should return the parsed items when the item validator parses', async () => {
  const validate = array(number());

  assert.deepEqual(await validate(['1', '2.5']), {
    state: 'valid',
    field: undefined,
    value: [1, 2.5],
  });
});

test('should return the transformed items when the item validator transforms', async () => {
  const validate = array(string({ trim: true }));

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
  const validate = array({ requiredMessage: 'Pick some.' });
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

test('should read the items of an iterable that is not an array', async () => {
  assert.deepEqual(await array(string())(new Set(['a', 'b'])), {
    state: 'valid',
    value: ['a', 'b'],
    field: undefined,
  });
});
