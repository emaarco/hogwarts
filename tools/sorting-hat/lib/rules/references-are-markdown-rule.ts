import type { Skill } from '../skill.ts';
import type { SkillRule } from '../skill-rule.ts';

export class ReferencesAreMarkdownRule implements SkillRule {
  readonly name = 'references-are-markdown';

  check(skill: Skill): string[] {
    return skill.files()
      .filter((file) => file.startsWith('references/') && !file.endsWith('.md'))
      .map((file) => `${file} is not Markdown, move code to scripts/ and templates or data to assets/`);
  }
}
