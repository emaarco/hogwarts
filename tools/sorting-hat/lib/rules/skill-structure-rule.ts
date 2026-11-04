import type { Skill } from '../skill.ts';
import type { SkillRule } from '../skill-rule.ts';

const ALLOWED_ENTRIES = ['SKILL.md', 'scripts', 'references', 'assets', 'evals'];

export class SkillStructureRule implements SkillRule {
  readonly name = 'skill-structure';

  check(skill: Skill): string[] {
    const missingSkillFile = skill.has('SKILL.md') ? [] : ['SKILL.md is missing'];
    const unexpectedEntries = skill.topLevelEntries()
      .filter((entry) => !ALLOWED_ENTRIES.includes(entry))
      .map((entry) => `${entry} is not part of the skill layout, allowed are ${ALLOWED_ENTRIES.join(', ')}`);
    return [...missingSkillFile, ...unexpectedEntries];
  }
}
