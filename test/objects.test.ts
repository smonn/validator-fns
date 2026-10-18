import { assert, expectTypeOf, test } from 'vitest';
import {
  check,
  createTypeValidator,
  messageTree,
  number,
  object,
  string,
  valid,
  type Result,
  type Validator,
} from '../src/index.js';

test('should keep a __proto__ field as an own property when it is in the schema', async () => {
  const validate = object(
    Object.fromEntries([
      ['__proto__', string({ messages: { required: 'Required' } })],
    ]),
  );

  const validResult = await validate(JSON.parse('{"__proto__": "x"}'));
  assert(validResult.state === 'valid');
  assert.deepEqual(Object.getOwnPropertyNames(validResult.value), [
    '__proto__',
  ]);
  assert.equal(Reflect.get(validResult.value ?? {}, '__proto__'), 'x');

  const invalidResult = await validate(JSON.parse('{"__proto__": null}'));
  assert.equal(
    Object.getOwnPropertyDescriptor(
      messageTree(invalidResult) ?? {},
      '__proto__',
    )?.value,
    'Required',
  );
});

test('should not change the prototype of the value when a __proto__ field is an object', async () => {
  const validate = object(
    Object.fromEntries([['__proto__', object({ admin: string() })]]),
  );

  const result = await validate(JSON.parse('{"__proto__": {"admin": "yes"}}'));

  assert(result.state === 'valid');
  assert.equal(Object.getPrototypeOf(result.value), Object.prototype);
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(result.value, '__proto__')?.value,
    { admin: 'yes' },
  );
});

test('should run each child on undefined with its usual field path when the object is missing', async () => {
  const seen: unknown[][] = [];
  const spy: Validator<string> = async (value, field) => {
    seen.push([value, field]);
    return valid({ value: 'spied', field });
  };

  await object({ a: spy, b: spy })(null, 'parent');
  assert.deepEqual(seen, [
    [undefined, 'parent.a'],
    [undefined, 'parent.b'],
  ]);
});

test('invalid configuration', () => {
  // JSON.parse returns any, which lets the test pass values the types reject.
  assert.throws(() => object(JSON.parse('"bad value"')));

  assert.throws(
    () => object(JSON.parse('{ "name": "test" }')),
    TypeError,
    '`name`',
  );
});

test('should skip collection tests when a field is invalid', async () => {
  let calls = 0;
  const validate = object(
    { password: string({ messages: { required: 'Required' } }) },
    check(() => {
      calls++;
      return false;
    }, 'never'),
  );

  assert.deepEqual(messageTree(await validate({})), { password: 'Required' });
  assert.strictEqual(calls, 0);
});

test('should compare parsed values when a collection test runs', async () => {
  const isoDate = createTypeValidator(
    async (value: unknown, field?: string): Promise<Result<Date>> =>
      valid({ value: new Date(String(value)), field }),
  )();
  const validate = object(
    { start: isoDate, end: isoDate },
    check(
      'end',
      (value) => (value.end ?? 0) > (value.start ?? 0),
      'order',
      'Must follow the start date.',
    ),
  );

  assert.deepEqual(
    messageTree(await validate({ start: '2024-01-02', end: '2024-01-01' })),
    { end: 'Must follow the start date.' },
  );
});

test('should type the check value as the parsed object when used in object()', () => {
  object(
    { password: string(), age: number() },
    check((value) => {
      expectTypeOf(value).toEqualTypeOf<{
        password: string;
        age: number;
      }>();
      return true;
    }, 'code'),
  );
});

/** A schema whose `a` getter runs `onRead` on it and returns `string()`. */
function schemaReading(
  onRead: (schema: Record<string, Validator>) => void,
): Record<string, Validator> {
  const schema: Record<string, Validator> = {};
  return Object.defineProperty(schema, 'a', {
    enumerable: true,
    configurable: true,
    get() {
      onRead(schema);
      return string();
    },
  });
}

test('should fail a key a strict schema getter adds while object() reads it', async () => {
  const schema = schemaReading((read) => {
    read['b'] = string();
  });

  assert.deepInclude(
    await object(schema, { strict: true })({ a: 'ok', b: 123 }),
    { state: 'invalid', code: 'unknownKeys', params: { keys: ['b'] } },
  );
});

test('should take the key of a strict schema getter that deletes itself while object() reads it', async () => {
  const schema = schemaReading((read) => {
    Reflect.deleteProperty(read, 'a');
  });

  assert.deepInclude(await object(schema, { strict: true })({ a: 'ok' }), {
    state: 'valid',
    value: { a: 'ok' },
  });
});
