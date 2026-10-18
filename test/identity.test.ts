import { assert, test } from 'vitest';
import {
  array,
  createTypeValidator,
  object,
  optional,
  string,
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
