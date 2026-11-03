import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSkill } from '../test-support/create-skill.ts';
import { MaxLineCountRule } from './max-line-count-rule.ts';

const rule = new MaxLineCountRule(3);

test('accepts files up to the limit', () => {
  const skill = createSkill('demo', { 'SKILL.md': 'one\ntwo\nthree\n', 'scripts/run.sh': 'one\ntwo\nthree' });

  assert.deepEqual(rule.check(skill), []);
});

test('reports every file above the limit, including nested ones', () => {
  const skill = createSkill('demo', { 'SKILL.md': 'one\ntwo\nthree\nfour\n', 'scripts/lib/run.sh': '1\n2\n3\n4\n5' });

  assert.deepEqual(rule.check(skill), [
    'SKILL.md has 4 lines, the limit is 3',
    'scripts/lib/run.sh has 5 lines, the limit is 3',
  ]);
});

test('skips binary files', () => {
  const skill = createSkill('demo', { 'assets/image.png': '\0\n\n\n\n\n' });

  assert.deepEqual(rule.check(skill), []);
});
