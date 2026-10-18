import { inspect } from 'node:util';
import { runInNewContext } from 'node:vm';
import { assert, test, vi } from 'vitest';
import {
  array,
  boolean,
  createTypeValidator,
  date,
  messageTree,
  number,
  object,
  oneOf,
  optional,
  string,
  valid,
  type TypeValidator,
} from '../src/index.js';

const invalidDate = new Date('x');

class Point {
  x = 1;
}

// [label, validator, expected type, inputs it accepts, inputs it fails]
const types: [
  string,
  TypeValidator<unknown, unknown>,
  string,
  unknown[],
  unknown[],
][] = [
  [
    'string()',
    string(),
    'string',
    ['', ' ', 'a'],
    [
      42,
      new String('a'),
      new Date(0),
      runInNewContext('new Date(0)'),
      true,
      Symbol('s'),
      {},
      ['a'],
    ],
  ],
  [
    'number()',
    number(),
    'number',
    [0, -0, -1.5, Number.MAX_VALUE],
    [
      '42',
      '',
      Number.NaN,
      Infinity,
      -Infinity,
      10n,
      new Number(1),
      new Date(0),
      runInNewContext('new Date(0)'),
      invalidDate,
      true,
    ],
  ],
  [
    'boolean()',
    boolean(),
    'boolean',
    [true, false],
    ['false', 0, 1, '', Number.NaN, invalidDate, new Boolean(true)],
  ],
  [
    'date()',
    date(),
    'date',
    [new Date(0), runInNewContext('new Date(0)')],
    [0, '2026-10-17', '', Number.NaN, invalidDate, {}],
  ],
  [
    'array()',
    array(),
    'array',
    [[], ['a'], runInNewContext('[1]')],
    [new Set(['a']), 'abc', '', {}, { length: 0 }],
  ],
  [
    'object()',
    object({}),
    'object',
    [{}, new Point(), new Date(0), new Map(), Object.create(null)],
    [
      [],
      () => ({}),
      new String('a'),
      new Number(1),
      new Boolean(false),
      Object(10n),
      Object(Symbol('s')),
      runInNewContext('new String("a")'),
      runInNewContext('[]'),
      'a',
      1,
      '',
    ],
  ],
];

test.each(types)(
  '%s accepts only its own type',
  async (label, validate, expected, accepted, failed) => {
    for (const input of accepted) {
      assert.deepInclude(
        await validate(input),
        { state: 'valid' },
        `${label} given ${inspect(input)}`,
      );
    }
    for (const input of failed) {
      assert.deepInclude(
        await validate(input, 'f'),
        { state: 'invalid', code: 'type', params: { expected }, field: 'f' },
        `${label} given ${inspect(input)}`,
      );
    }
  },
);

test.each(types)(
  '%s fails a revoked Proxy with type',
  async (_label, validate, expected) => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    assert.deepInclude(await validate(proxy), {
      code: 'type',
      params: { expected },
    });
    assert.deepEqual(messageTree(await object({ a: validate })({ a: proxy })), {
      a: 'type',
    });
  },
);

test('built-ins keep the value they accept as it is', async () => {
  const foreign: Date = runInNewContext('new Date(0)');
  assert.deepInclude(await date()(foreign), { value: foreign });
  const point = new Point();
  const result = await object({ x: number() })(point);
  assert.deepInclude(result, { state: 'valid', value: { x: 1 } });
  assert.deepInclude(await string()(''), { value: '' });
});

// object({}) builds {} from its children for missing input, so the object
// here has a child that fails on undefined.
const required = types.map(
  ([label, validate]): [string, TypeValidator<unknown, unknown>] => [
    label,
    label === 'object()' ? object({ a: string() }) : validate,
  ],
);

test.each(required)(
  '%s fails undefined and null with required, and optional() returns them',
  async (label, validate) => {
    for (const input of [undefined, null]) {
      assert.deepEqual(
        await validate(input, 'f'),
        {
          state: 'invalid',
          code: 'required',
          params: {},
          message: 'required',
          field: 'f',
          errors: undefined,
        },
        `${label} given ${inspect(input)}`,
      );
      assert.deepEqual(
        await optional(validate)(input, 'f'),
        { state: 'valid', value: input, field: 'f' },
        `optional(${label}) given ${inspect(input)}`,
      );
    }
  },
);

test('optional() fails a present value of the wrong type', async () => {
  for (const input of ['', Number.NaN, invalidDate]) {
    assert.deepInclude(await optional(number())(input), { code: 'type' });
    assert.deepInclude(await optional(date())(input), { code: 'type' });
  }
  assert.deepInclude(await optional(string())(''), {
    state: 'valid',
    value: '',
  });
});

test('a custom parser is never called with undefined or null', async () => {
  const seen: unknown[] = [];
  const parser = async (value: unknown, field?: string) => {
    seen.push(value);
    return valid({ value: String(value), field });
  };
  const validate = createTypeValidator(parser)();

  for (const input of [undefined, null]) {
    assert.deepInclude(await validate(input), { code: 'required' });
    assert.deepInclude(await optional(validate)(input), { state: 'valid' });
  }
  assert.deepInclude(await validate(''), { state: 'valid', value: '' });
  assert.deepEqual(seen, ['']);
});

test('oneOf() matches a date from another realm', async () => {
  const validate = date(oneOf([new Date(0)]));
  assert.deepInclude(await validate(runInNewContext('new Date(0)')), {
    state: 'valid',
  });
  assert.deepInclude(await validate(runInNewContext('new Date(1)')), {
    code: 'oneOf',
  });
  // By its time, which an own valueOf can't change.
  const spoof = new Date(0);
  spoof.valueOf = () => 5;
  assert.deepInclude(await validate(spoof), { state: 'valid' });
  assert.deepInclude(await date(oneOf([new Date(5)]))(spoof), {
    code: 'oneOf',
  });
  // Only a date matches by time, not its timestamp.
  assert.deepInclude(await oneOf<number | Date>([new Date(0)])(0), {
    code: 'oneOf',
  });
});

test('object() accepts objects where BigInt is missing, as before Safari 14', async () => {
  const bigInt: unknown = Reflect.get(globalThis, 'BigInt');
  Reflect.deleteProperty(globalThis, 'BigInt');
  try {
    assert.deepInclude(await object({})({}), { state: 'valid' });
    assert.deepInclude(await object({ name: string() })({ name: 'Ada' }), {
      state: 'valid',
    });
    // A Map has a Symbol.toStringTag, so it takes the brand checks, which
    // then skip BigInt.
    assert.deepInclude(await object({})(new Map()), { state: 'valid' });
    assert.deepInclude(await object({})(Object('a')), { code: 'type' });
  } finally {
    Reflect.set(globalThis, 'BigInt', bigInt);
  }
});

test('oneOf() keeps a primitive off the date path', async () => {
  const getTime = vi.spyOn(Date.prototype, 'getTime');
  try {
    assert.deepInclude(await oneOf<string>(['a', 'b'])('c'), { code: 'oneOf' });
    assert.deepInclude(await oneOf([1, 2])(1), { state: 'valid' });
    assert.deepInclude(await oneOf<string | Date>(['a', new Date(0)])('c'), {
      code: 'oneOf',
    });
    assert.equal(getTime.mock.calls.length, 0);
    // A date still matches by its time, and skips the primitives.
    assert.deepInclude(
      await oneOf<string | Date>(['a', new Date(0)])(new Date(0)),
      { state: 'valid' },
    );
    assert.equal(getTime.mock.calls.length, 2);
    // An object that isn't a date has no time, even with its own getTime.
    // Reflect.apply lets the test pass a value the types reject.
    const fake = { getTime: () => 0 };
    for (const allowed of [new Date(0), { getTime: () => 0 }]) {
      const validate: unknown = Reflect.apply(oneOf, undefined, [[allowed]]);
      assert(typeof validate === 'function');
      const result: unknown = await Reflect.apply(validate, undefined, [fake]);
      assert.deepInclude(result, { code: 'oneOf' });
    }
  } finally {
    getTime.mockRestore();
  }
});

test('object() takes plain objects and class instances without probing the wrappers', async () => {
  const valueOf = vi.spyOn(String.prototype, 'valueOf');
  try {
    for (const value of [
      {},
      Object.create(null),
      new Point(),
      runInNewContext('({})'),
    ]) {
      assert.deepInclude(await object({})(value), { state: 'valid' });
    }
    assert.equal(valueOf.mock.calls.length, 0);
  } finally {
    valueOf.mockRestore();
  }
});

test.each<[string, () => unknown]>([
  ['an array with a null prototype', () => Object.setPrototypeOf([], null)],
  [
    'an array with the object prototype',
    () => Object.setPrototypeOf([], Object.prototype),
  ],
  [
    'an array Proxy reporting the object prototype',
    () => new Proxy([], { getPrototypeOf: () => Object.prototype }),
  ],
  ...(
    [
      ['string', 'x'],
      ['number', 1],
      ['boolean', true],
    ] satisfies [string, unknown][]
  ).flatMap(([type, primitive]): [string, () => unknown][] => [
    [
      `a boxed ${type} with a null prototype`,
      () => Object.setPrototypeOf(Object(primitive), null),
    ],
    [
      `a boxed ${type} with the object prototype`,
      () => Object.setPrototypeOf(Object(primitive), Object.prototype),
    ],
  ]),
  [
    'a boxed string with a Symbol.toStringTag getter',
    () =>
      Object.defineProperty(Object('x'), Symbol.toStringTag, {
        get: () => 'Object',
      }),
  ],
])('object() fails %s with type', async (_label, make) => {
  assert.deepInclude(await object({})(make()), {
    code: 'type',
    params: { expected: 'object' },
  });
});

// Known behaviour, pending #779's "Decisions needed": Symbol and BigInt
// wrappers have no tag of their own, so with a swapped prototype they take the
// fast path. Only throwing brand checks can tell them apart.
test.each<[string, unknown]>([
  ['symbol', Symbol('s')],
  ['bigint', 1n],
])(
  'object() accepts a boxed %s with a swapped prototype',
  async (_type, primitive) => {
    for (const proto of [null, Object.prototype]) {
      const boxed: unknown = Object.setPrototypeOf(Object(primitive), proto);
      assert.deepInclude(await object({})(boxed), { state: 'valid' });
    }
  },
);

test('object() accepts an object with a Symbol.toStringTag getter', async () => {
  const tagged = {
    get [Symbol.toStringTag]() {
      return 'String';
    },
  };
  assert.deepInclude(await object({})(tagged), { state: 'valid' });
});
