import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSkill, skillFile } from '../test-support/create-skill.ts';
import { SkillFrontmatterRule } from './skill-frontmatter-rule.ts';

const rule = new SkillFrontmatterRule();

test('accepts a name matching the folder and a description', () => {
  assert.deepEqual(rule.check(createSkill('demo-skill', { 'SKILL.md': skillFile('demo-skill') })), []);
});

test('leaves a missing SKILL.md to the structure rule', () => {
  assert.deepEqual(rule.check(createSkill('demo', {})), []);
});

test('reports a SKILL.md without frontmatter', () => {
  assert.deepEqual(rule.check(createSkill('demo', { 'SKILL.md': '# demo\n' })), ['SKILL.md has no frontmatter']);
});

test('reports missing name and description', () => {
  const skill = createSkill('demo', { 'SKILL.md': '---\nallowed-tools: Bash\n---\n' });

  assert.deepEqual(rule.check(skill), ['name is missing', 'description is missing']);
});

test('reports a name that differs from the folder or is not kebab-case', () => {
  const skill = createSkill('demo', { 'SKILL.md': skillFile('Demo_Skill') });

  assert.deepEqual(rule.check(skill), [
    'name "Demo_Skill" does not match the folder name "demo"',
    'name "Demo_Skill" is not lowercase-kebab',
  ]);
});

test('reports a description above 1024 characters', () => {
  const skill = createSkill('demo', { 'SKILL.md': skillFile('demo', 'x'.repeat(1025)) });

  assert.deepEqual(rule.check(skill), ['description has 1025 characters, the limit is 1024']);
});
