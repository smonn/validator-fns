import { assert, test } from 'vitest';
import {
  array,
  exact,
  invalid,
  max,
  messageTree,
  min,
  number,
  object,
  string,
  transform,
  valid,
  type Test,
  type Validator,
} from '../src/index.js';

// A validator that accepts anything and counts its calls.
function spy(): Validator & { calls: number } {
  const counted = Object.assign(
    async (value?: unknown, field?: string) => {
      counted.calls += 1;
      return valid({ value, field });
    },
    { calls: 0 },
  );
  return counted;
}

// A collection test that accepts the value and records each value it gets.
function recorder<T>(): Test<T, never> & { seen: T[] } {
  const seen: T[] = [];
  const recorded: Test<T, never> = async (value, field) => {
    seen.push(value);
    return valid({ value, field });
  };
  return Object.assign(recorded, { seen });
}

// min() inside a test of its own, which isn't a length gate.
const wrappedMin: Test<number[], never> = async (value, field) =>
  min<number[]>(2)(value, field);

// Fails numbers that aren't in ascending order.
const ascending: Test<number[], never> = async (value, field) =>
  value.slice(1).every((item, index) => {
    const previous = value[index];
    return previous !== undefined && previous <= item;
  })
    ? valid({ value, field })
    : invalid({ code: 'ascending', field });

test('array() checks max before any item runs, wherever max comes', async () => {
  const before = recorder<unknown[]>();
  const first = spy();
  const second = spy();
  const cases = [
    { item: first, validate: array(first, max(5)) },
    { item: second, validate: array(second, before, max(5)) },
  ];
  for (const { item, validate } of cases) {
    const result = await validate([1, 2, 3, 4, 5, 6], 'list');
    assert.deepEqual(result, {
      state: 'invalid',
      code: 'max',
      params: { max: 5, amount: 6 },
      message: 'max',
      field: 'list',
      errors: undefined,
    });
    assert.equal(item.calls, 0);
  }
  assert.deepEqual(before.seen, []);
});

test('array() checks min and exact before any item runs', async () => {
  for (const [code, gate] of [
    ['min', min<unknown[]>(3)],
    ['exact', exact<unknown[]>(3)],
  ] as const) {
    const item = spy();
    assert.deepInclude(await array(item, gate)([1, 2]), {
      state: 'invalid',
      code,
    });
    assert.equal(item.calls, 0, code);
  }
});

test('array() words a length failure from its messages config', async () => {
  const validate = array(
    number(),
    { messages: { max: 'At most {max}.' } },
    max(1),
  );
  assert.deepInclude(await validate([1, 2]), { message: 'At most 1.' });
});

test('array() runs a wrapped min after the items, as a collection test', async () => {
  const validate = array(number(), wrappedMin);

  assert.deepInclude(await validate(['a']), {
    state: 'invalid',
    code: 'items',
  });
  assert.deepInclude(await validate([1]), { state: 'invalid', code: 'min' });
  assert.deepInclude(await validate([1, 2]), { state: 'valid' });
});

test('array() runs every item, and reports each failure', async () => {
  const counted = spy();
  const item: Validator<number, string> = async (value, field) => {
    await counted(value, field);
    return number()(value, field);
  };
  const result = await array(item)(['a', 1, 'b']);

  assert.equal(counted.calls, 3);
  assert.deepEqual(messageTree(result), ['type', null, 'type']);
});

test('object() runs every field, and reports each failure', async () => {
  const counted = spy();
  const field: Validator<number, string> = async (value, name) => {
    await counted(value, name);
    return number()(value, name);
  };
  const result = await object({ a: field, b: field, c: field })({
    a: 'x',
    b: 1,
    c: 'y',
  });

  assert.equal(counted.calls, 3);
  assert.deepEqual(messageTree(result), { a: 'type', c: 'type' });
});

test('array() skips its collection tests while an item fails', async () => {
  const record = recorder<number[]>();
  const result = await array(number(), record)([1, 'a']);

  assert.deepInclude(result, { state: 'invalid', code: 'items' });
  assert.deepEqual(record.seen, []);
});

test('array() gives its collection tests the parsed items', async () => {
  const record = recorder<string[]>();
  const validate = array(string(transform((value) => value.trim())), record);

  assert.deepEqual(await validate([' a ', 'b '], 'tags'), {
    state: 'valid',
    value: ['a', 'b'],
    field: 'tags',
  });
  assert.deepEqual(record.seen, [['a', 'b']]);
});

test('array() stops its collection tests at the first failure', async () => {
  const after = recorder<number[]>();
  const validate = array(number(), ascending, after);

  assert.deepInclude(await validate([2, 1]), {
    state: 'invalid',
    code: 'ascending',
  });
  assert.deepEqual(after.seen, []);
});

test('array() words a collection test failure from its messages config', async () => {
  const validate = array(
    number(),
    { messages: { ascending: 'In order, please.' } },
    ascending,
  );

  assert.deepInclude(await validate([2, 1]), { message: 'In order, please.' });
});

test('array() returns the value its last collection test gives', async () => {
  const padded = array(
    number(),
    transform((value: number[]) => [...value, 0, 0]),
    max(2),
  );

  // max checks the input before the transform, so the padded value can be
  // longer.
  assert.deepEqual(await padded([1, 2]), {
    state: 'valid',
    value: [1, 2, 0, 0],
    field: undefined,
  });
  assert.deepInclude(await padded([1, 2, 3]), { code: 'max' });
});

test('strict object() fails unknown keys before any field runs', async () => {
  const field = spy();
  const validate = object({ a: field, constructor: field }, { strict: true });
  const input = JSON.parse('{"a":1,"b":2,"__proto__":3,"toString":4}');

  assert.deepEqual(await validate(input, 'user'), {
    state: 'invalid',
    code: 'unknownKeys',
    params: { keys: ['b', '__proto__', 'toString'] },
    message: 'unknownKeys',
    field: 'user',
    errors: undefined,
  });
  assert.equal(field.calls, 0);
  assert.deepEqual(await validate({ a: 1, constructor: 2 }), {
    state: 'valid',
    value: { a: 1, constructor: 2 },
    field: undefined,
  });
});

test('strict object() words unknownKeys from its messages config', async () => {
  const validate = object(
    { a: number() },
    { strict: true, messages: { unknownKeys: 'Unexpected: {keys}.' } },
  );

  assert.deepInclude(await validate({ a: 1, b: 2, c: 3 }), {
    message: 'Unexpected: b,c.',
  });
});

test('strict object() builds a missing object from its fields', async () => {
  const validate = object({ a: number({ default: 1 }) }, { strict: true });

  assert.deepInclude(await validate(undefined), {
    state: 'valid',
    value: { a: 1 },
  });
});

test('object() strips unknown keys unless strict', async () => {
  for (const config of [undefined, {}, { strict: false }]) {
    assert.deepEqual(await object({ a: number() }, config)({ a: 1, b: 2 }), {
      state: 'valid',
      value: { a: 1 },
      field: undefined,
    });
  }
});
