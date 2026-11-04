import type { Skill } from './skill.ts';

export interface SkillRule {
  readonly name: string;
  check(skill: Skill): string[];
}
