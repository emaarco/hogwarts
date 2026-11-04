import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RuleValidator } from './rule-validator.ts';
import type { Skill } from './skill.ts';
import type { SkillRule } from './skill-rule.ts';
import { createSkill } from './test-support/create-skill.ts';

class AlwaysFailingRule implements SkillRule {
  readonly name = 'always-failing';

  check(skill: Skill): string[] {
    return [`${skill.name} fails`];
  }
}

class AlwaysPassingRule implements SkillRule {
  readonly name = 'always-passing';

  check(): string[] {
    return [];
  }
}

test('reports every message of every rule for every skill', () => {
  const skills = [createSkill('first', {}), createSkill('second', {})];
  const validator = new RuleValidator([new AlwaysFailingRule(), new AlwaysPassingRule()]);

  assert.deepEqual(validator.validate(skills), [
    { skill: 'first', rule: 'always-failing', message: 'first fails' },
    { skill: 'second', rule: 'always-failing', message: 'second fails' },
  ]);
});

test('reports nothing when all rules pass', () => {
  const validator = new RuleValidator([new AlwaysPassingRule()]);

  assert.deepEqual(validator.validate([createSkill('first', {})]), []);
});
