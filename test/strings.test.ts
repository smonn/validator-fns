import { assert, test } from 'vitest';
import { matches } from '../src/index';

test('should pass each matching value when the pattern has the global flag', async () => {
  const validate = matches(/a/g, 'invalid');
  assert.equal((await validate('ab')).state, 'valid');
  assert.equal((await validate('a')).state, 'valid');
});

test('should pass each matching value when the pattern has the sticky flag', async () => {
  const validate = matches(/a/y, 'invalid');
  assert.equal((await validate('a')).state, 'valid');
  assert.equal((await validate('a')).state, 'valid');
});

test('should leave lastIndex unchanged when testing the caller pattern', async () => {
  const pattern = /a/g;
  const validate = matches(pattern, 'invalid');
  await validate('ab');
  assert.equal(pattern.lastIndex, 0);
});
