import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSkill } from '../test-support/create-skill.ts';
import { SkillStructureRule } from './skill-structure-rule.ts';

const rule = new SkillStructureRule();

test('accepts the standard skill layout', () => {
  const skill = createSkill('demo', {
    'SKILL.md': '',
    'scripts/run.sh': '',
    'references/api.md': '',
    'assets/template.json': '',
    'evals/evals.json': '',
  });

  assert.deepEqual(rule.check(skill), []);
});

test('reports a missing SKILL.md', () => {
  assert.deepEqual(rule.check(createSkill('demo', { 'references/api.md': '' })), ['SKILL.md is missing']);
});

test('reports entries outside the standard layout', () => {
  const skill = createSkill('demo', { 'SKILL.md': '', 'reference/api.md': '', 'notes.txt': '' });

  assert.deepEqual(rule.check(skill).sort(), [
    'notes.txt is not part of the skill layout, allowed are SKILL.md, scripts, references, assets, evals',
    'reference is not part of the skill layout, allowed are SKILL.md, scripts, references, assets, evals',
  ]);
});

test('ignores .DS_Store', () => {
  assert.deepEqual(rule.check(createSkill('demo', { 'SKILL.md': '', '.DS_Store': '' })), []);
});
