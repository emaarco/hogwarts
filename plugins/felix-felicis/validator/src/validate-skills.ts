import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RuleValidator } from './rule-validator.ts';
import { Skill } from './skill.ts';
import { MaxLineCountRule } from './rules/max-line-count-rule.ts';
import { ReferencesAreMarkdownRule } from './rules/references-are-markdown-rule.ts';
import { SkillFrontmatterRule } from './rules/skill-frontmatter-rule.ts';
import { SkillStructureRule } from './rules/skill-structure-rule.ts';

const skillsDirectory = process.argv[2] ?? 'skills';

const skills = readdirSync(skillsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => new Skill(join(skillsDirectory, entry.name)));

const validator = new RuleValidator([
  new SkillStructureRule(),
  new SkillFrontmatterRule(),
  new ReferencesAreMarkdownRule(),
  new MaxLineCountRule(500),
]);

const violations = validator.validate(skills);

for (const violation of violations) {
  console.error(`✗ ${violation.skill} [${violation.rule}] ${violation.message}`);
}

if (violations.length > 0) {
  console.error(`\n${violations.length} violation(s) in ${skills.length} skills`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${skills.length} skills pass all rules`);
}
