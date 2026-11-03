import type { Skill } from '../skill.ts';
import type { SkillRule } from '../skill-rule.ts';

export class MaxLineCountRule implements SkillRule {
  readonly name = 'max-line-count';
  readonly #maxLines: number;

  constructor(maxLines: number) {
    this.#maxLines = maxLines;
  }

  check(skill: Skill): string[] {
    return skill.files()
      .map((file) => ({ file, content: skill.read(file) }))
      .filter(({ content }) => !MaxLineCountRule.#isBinary(content))
      .map(({ file, content }) => ({ file, lineCount: MaxLineCountRule.#countLines(content) }))
      .filter(({ lineCount }) => lineCount > this.#maxLines)
      .map(({ file, lineCount }) => `${file} has ${lineCount} lines, the limit is ${this.#maxLines}`);
  }

  static #isBinary(content: string): boolean {
    return content.includes('\0');
  }

  static #countLines(content: string): number {
    if (content === '') return 0;
    const lines = content.split('\n');
    return content.endsWith('\n') ? lines.length - 1 : lines.length;
  }
}
