import { assert, test } from 'vitest';
import {
  array,
  createValidator,
  object,
  optional,
  string,
  type TypeValidator,
} from '../src/index.js';

// A recursive schema's validators nest this deep in one call before the next
// starts on a later microtask, which keeps deep input from overflowing the stack.
const syncNesting = 100;

/** `depth` levels of `{ child }` around `leaf`, built without recursion. */
function nestedObject(depth: number, leaf: unknown = {}): unknown {
  let node = leaf;
  for (let level = 0; level < depth; level += 1) {
    node = { child: node };
  }
  return node;
}

/** `depth` levels of `[[…]]`, built without recursion. */
function nestedArray(depth: number): unknown[] {
  let node: unknown[] = [];
  for (let level = 0; level < depth; level += 1) {
    node = [node];
  }
  return node;
}

/** How many times `tree`'s custom validator has run. */
let entered = 0;

const tree: TypeValidator<unknown, unknown> = object({
  child: optional(
    createValidator((value, field) => {
      entered += 1;
      return tree(value, field);
    }),
  ),
});
const list: TypeValidator<unknown, unknown> = array(
  createValidator((value, field) => list(value, field)),
);

/** How many levels `tree` enters within its call, before any microtask. */
async function enteredInCall(depth: number): Promise<number> {
  entered = 0;
  const validated = tree(nestedObject(depth));
  const inCall = entered;
  await validated;
  return inCall;
}

test('should run 100 nested validators within the call and start the 101st on a later microtask', async () => {
  entered = 0;
  const validated = tree(nestedObject(syncNesting + 1));

  assert.strictEqual(entered, syncNesting);
  assert.deepInclude(await validated, { state: 'valid' });
  assert.strictEqual(entered, syncNesting + 1);
});

test('should run nested validators within the call after more than 100 synchronous throws', async () => {
  const throwing = string((): never => {
    throw new Error('bug');
  });
  for (let run = 0; run <= syncNesting; run += 1) {
    await throwing('a').catch(() => undefined);
  }

  assert.strictEqual(await enteredInCall(syncNesting), syncNesting);
});

test('should validate two interleaved deep inputs, then run nested validators within the call', async () => {
  const good = nestedObject(150);
  const bad = nestedObject(150, { child: 'leaf' });

  const [goodResult, badResult] = await Promise.all([tree(good), tree(bad)]);

  // The leaf's missing child comes back as `child: undefined`.
  const parsed = nestedObject(150, { child: undefined });
  assert.deepInclude(goodResult, { state: 'valid', value: parsed });
  assert.deepInclude(badResult, { state: 'invalid' });
  assert.strictEqual(await enteredInCall(syncNesting), syncNesting);
});

test.each<[string, () => Promise<unknown>]>([
  ['object()', async () => tree(nestedObject(50_000))],
  ['array()', async () => list(nestedArray(50_000))],
])(
  'should validate a recursive %s schema nested past the stack, with no unhandled rejection',
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
