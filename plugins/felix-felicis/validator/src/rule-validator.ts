import type { Skill } from './skill.ts';
import type { SkillRule } from './skill-rule.ts';

export type Violation = {
  skill: string;
  rule: string;
  message: string;
};

export class RuleValidator {
  readonly #rules: SkillRule[];

  constructor(rules: SkillRule[]) {
    this.#rules = rules;
  }

  validate(skills: Skill[]): Violation[] {
    return skills.flatMap((skill) => this.#rules.flatMap((rule) => RuleValidator.#apply(rule, skill)));
  }

  static #apply(rule: SkillRule, skill: Skill): Violation[] {
    return rule.check(skill).map((message) => ({ skill: skill.name, rule: rule.name, message }));
  }
}
