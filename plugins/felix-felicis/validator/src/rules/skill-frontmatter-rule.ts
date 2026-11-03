import type { Skill } from '../skill.ts';
import type { SkillRule } from '../skill-rule.ts';

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

export class SkillFrontmatterRule implements SkillRule {
  readonly name = 'skill-frontmatter';

  check(skill: Skill): string[] {
    if (!skill.has('SKILL.md')) return [];
    const frontmatter = skill.frontmatter();
    if (frontmatter === undefined) return ['SKILL.md has no frontmatter'];
    return [
      ...SkillFrontmatterRule.#checkName(frontmatter.get('name'), skill.name),
      ...SkillFrontmatterRule.#checkDescription(frontmatter.get('description')),
    ];
  }

  static #checkName(name: string | undefined, folderName: string): string[] {
    if (!name) return ['name is missing'];
    const problems: string[] = [];
    if (name !== folderName) problems.push(`name "${name}" does not match the folder name "${folderName}"`);
    if (!KEBAB_CASE.test(name)) problems.push(`name "${name}" is not lowercase-kebab`);
    if (name.length > MAX_NAME_LENGTH) problems.push(`name is longer than ${MAX_NAME_LENGTH} characters`);
    return problems;
  }

  static #checkDescription(description: string | undefined): string[] {
    if (!description) return ['description is missing'];
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return [`description has ${description.length} characters, the limit is ${MAX_DESCRIPTION_LENGTH}`];
    }
    return [];
  }
}
