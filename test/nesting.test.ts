import { assert, test } from 'vitest';
import {
  array,
  createValidator,
  object,
  optional,
  string,
  valid,
  type TypeValidator,
} from '../src/index.js';

// Type validators, built-in or custom, run this deep one inside another in one
// call before the next starts on a later microtask, which keeps deep input
// from overflowing the stack.
const syncNesting = 100;

type Wrap = (
  inner: TypeValidator<unknown, unknown>,
) => TypeValidator<unknown, unknown>;

const inArray: Wrap = (inner) => array(inner);
const inObject: Wrap = (inner) => object({ child: optional(inner) });

/** `depth` levels of `{ child }` around `leaf`, built without recursion. */
function nestedObject(depth: number, leaf: unknown = {}): unknown {
  let node = leaf;
  for (let level = 0; level < depth; level += 1) {
    node = { child: node };
  }
  return node;
}

/** `depth` levels of `[…]` around `leaf`, built without recursion. */
function nestedArray(depth: number, leaf: unknown = []): unknown {
  let node = leaf;
  for (let level = 0; level < depth; level += 1) {
    node = [node];
  }
  return node;
}

/** `inner` inside `layers` layers of `wrap`. */
function wrapped(
  inner: TypeValidator<unknown, unknown>,
  layers: number,
  wrap: Wrap,
): TypeValidator<unknown, unknown> {
  let validator = inner;
  for (let layer = 0; layer < layers; layer += 1) {
    validator = wrap(validator);
  }
  return validator;
}

/**
 * A recursive schema: `layers` layers of `wrap` around a custom validator that
 * calls the schema again.
 */
function recursive(
  layers: number,
  wrap: Wrap,
): TypeValidator<unknown, unknown> {
  const schema: TypeValidator<unknown, unknown> = wrapped(
    createValidator((value, field) => schema(value, field)),
    layers,
    wrap,
  );
  return schema;
}

/** Whether `probe` has run since it was last reset. */
let probed = false;
const probe = async (value: string, field?: string) => {
  probed = true;
  return valid({ value, field });
};

/**
 * Whether `string(probe)` inside `layers` `array()` layers, `layers + 1` nested
 * type validators, runs its test within the call.
 */
async function probedInCall(layers: number): Promise<boolean> {
  probed = false;
  const validated = wrapped(
    string(probe),
    layers,
    inArray,
  )(nestedArray(layers, 'leaf'));
  const inCall = probed;
  assert.deepInclude(await validated, { state: 'valid' });
  assert.isTrue(probed);
  return inCall;
}

test('should run 100 nested type validators within the call and start the 101st on a later microtask', async () => {
  assert.isTrue(await probedInCall(syncNesting - 1));
  assert.isFalse(await probedInCall(syncNesting));
});

test('should run nested type validators within the call after more than 100 synchronous throws', async () => {
  const throwing = string((): never => {
    throw new Error('bug');
  });
  for (let run = 0; run <= syncNesting; run += 1) {
    await throwing('a').catch(() => undefined);
  }

  assert.isTrue(await probedInCall(syncNesting - 1));
});

test('should validate two interleaved deep inputs, then run nested type validators within the call', async () => {
  const tree = recursive(1, inObject);
  const good = nestedObject(150);
  const bad = nestedObject(150, { child: 'leaf' });

  const [goodResult, badResult] = await Promise.all([tree(good), tree(bad)]);

  // The leaf's missing child comes back as `child: undefined`.
  const parsed = nestedObject(150, { child: undefined });
  assert.deepInclude(goodResult, { state: 'valid', value: parsed });
  assert.deepInclude(badResult, { state: 'invalid' });
  assert.isTrue(await probedInCall(syncNesting - 1));
});

// [label, validates deep input]. With 100 layers to a custom edge, counting
// only the custom calls would let 10,000 runs nest, which overflows the stack
// even once the code is warm.
test.each<[string, () => Promise<unknown>]>([
  [
    'a recursive schema of 100 array() layers 20,000 deep',
    async () => recursive(100, inArray)(nestedArray(20_000)),
  ],
  [
    'a recursive schema of 100 object() layers 20,000 deep',
    async () => recursive(100, inObject)(nestedObject(20_000)),
  ],
  [
    '10,000 array() layers around string()',
    async () => wrapped(string(), 10_000, inArray)(nestedArray(10_000, 'leaf')),
  ],
  [
    'a recursive object() schema 50,000 deep',
    async () => recursive(1, inObject)(nestedObject(50_000)),
  ],
  [
    'a recursive array() schema 50,000 deep',
    async () => recursive(1, inArray)(nestedArray(50_000)),
  ],
])(
  'should validate %s, with no unhandled rejection',
  async (_label, validate) => {
    let unhandled = 0;
    const count = () => {
      unhandled += 1;
    };
    process.on('unhandledRejection', count);
    try {
      assert.deepInclude(await validate(), { state: 'valid' });
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    } finally {
      process.off('unhandledRejection', count);
    }

    assert.strictEqual(unhandled, 0);
  },
);
