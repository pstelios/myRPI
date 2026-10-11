import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shout } from '../src/shout.js';

test('Shouting a greeting', () => {
  assert.equal(shout('Ada'), 'HELLO, ADA!');
});
