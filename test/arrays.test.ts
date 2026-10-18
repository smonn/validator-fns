import { assert, test } from 'vitest';
import {
  array,
  createTypeValidator,
  object,
  string,
  valid,
  type Validator,
} from '../src/index.js';

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
    createTypeValidator(async (value: unknown, field?: string) =>
      valid({ value: String(value), field }),
    )(),
  );

  assert.deepEqual(await validate([1, 2.5]), {
    state: 'valid',
    field: undefined,
    value: ['1', '2.5'],
  });
});

test('array() rejects the 2.x order, config before the item validator', () => {
  // JavaScript callers can still pass it; TypeScript rejects it.
  assert.throws(
    () => Reflect.apply(array, undefined, [{ default: [] }, string()]),
    TypeError,
    'array(item, config?, ...tests)',
  );
});
