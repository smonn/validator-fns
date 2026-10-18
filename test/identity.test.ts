import { assert, test } from 'vitest';
import {
  array,
  createTypeValidator,
  createValidatorTest,
  invalid,
  min,
  object,
  optional,
  string,
  type Test,
  transform,
  valid,
  type Validator,
} from '../src/index.js';

// Wrappers of a built-in that answer 'wrapped', so a run that skips them and
// runs the built-in in their place gives the input back.
const wrapped = (field?: string) => valid({ value: 'wrapped', field });
const wrappers: [string, Validator<string, string>][] = [
  [
    'a Proxy of string()',
    new Proxy(string(), {
      apply: async (_target, _this, [, field]: [unknown, string?]) =>
        wrapped(field),
    }),
  ],
  [
    'a function with string() assigned',
    Object.assign(
      async (_value?: unknown, field?: string) => wrapped(field),
      string(),
    ),
  ],
];

test.each(wrappers)(
  'should run %s as an array() item',
  async (_label, wrapper) => {
    assert.deepInclude(await array(wrapper)(['input']), {
      state: 'valid',
      value: ['wrapped'],
    });
  },
);

test.each(wrappers)(
  'should run %s as an object() property',
  async (_label, wrapper) => {
    assert.deepInclude(await object({ a: wrapper })({ a: 'input' }), {
      state: 'valid',
      value: { a: 'wrapped' },
    });
  },
);

test.each(wrappers)(
  'should run %s as a createTypeValidator() parser',
  async (_label, wrapper) => {
    assert.deepInclude(await createTypeValidator(wrapper)()('input'), {
      state: 'valid',
      value: 'wrapped',
    });
  },
);

test.each(wrappers)('should run %s in optional()', async (_label, wrapper) => {
  assert.deepInclude(await optional(wrapper)('input'), {
    state: 'valid',
    value: 'wrapped',
  });
});

// Wrappers of a built-in test that fail with 'wrapped', so a run that skips
// them and runs the built-in's twin in their place passes (#794).
const failing = (field?: string) => invalid({ code: 'wrapped', field });
function wrap<T>(
  name: string,
  builtIn: Test<T, never>,
): [string, Test<T, never>][] {
  return [
    [
      `a Proxy of ${name}`,
      new Proxy(builtIn, {
        apply: async (_target, _this, [, field]: [unknown, string?]) =>
          failing(field),
      }),
    ],
    [
      `a function with ${name} assigned`,
      Object.assign(
        async (_value: T, field?: string) => failing(field),
        builtIn,
      ),
    ],
  ];
}

test.each([
  ...wrap('min()', min<string>(1)),
  ...wrap(
    'transform()',
    transform((value: string) => value.toUpperCase()),
  ),
  ...wrap(
    'a createValidatorTest() test',
    createValidatorTest('long', (value: string) => value.length > 1),
  ),
])('should run %s as itself', async (_label, wrapper) => {
  assert.deepInclude(await string(wrapper)('abc'), {
    state: 'invalid',
    code: 'wrapped',
  });
});

test.each(wrap('min()', min<string[]>(1)))(
  'should run %s as an array() test, not as its length gate',
  async (_label, wrapper) => {
    assert.deepInclude(await array(string(), wrapper)(['a']), {
      state: 'invalid',
      code: 'wrapped',
    });
  },
);
