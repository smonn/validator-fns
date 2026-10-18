import { inspect } from 'node:util';
import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';
import {
  array,
  boolean,
  date,
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

test('built-ins keep the value they accept as it is', async () => {
  const foreign: Date = runInNewContext('new Date(0)');
  assert.deepInclude(await date()(foreign), { value: foreign });
  const point = new Point();
  const result = await object({ x: number() })(point);
  assert.deepInclude(result, { state: 'valid', value: { x: 1 } });
  assert.deepInclude(await string()(''), { value: '' });
});

test.each(types)(
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
  const validate = string({ parser });

  for (const input of [undefined, null]) {
    assert.deepInclude(await validate(input), { code: 'required' });
    assert.deepInclude(await optional(validate)(input), { state: 'valid' });
  }
  assert.deepInclude(
    await array({
      parser: async (value, field) => {
        seen.push(value);
        return valid({ value: [], field });
      },
    })(null),
    { code: 'required' },
  );
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
});
