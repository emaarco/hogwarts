#!/usr/bin/env node
import { ClaudePluginValidation } from '../lib/claude-plugin-validation.ts';
import { Marketplace } from '../lib/marketplace.ts';
import { RuleValidator } from '../lib/rule-validator.ts';
import { MaxLineCountRule } from '../lib/rules/max-line-count-rule.ts';
import { ReferencesAreMarkdownRule } from '../lib/rules/references-are-markdown-rule.ts';
import { SkillFrontmatterRule } from '../lib/rules/skill-frontmatter-rule.ts';
import { SkillStructureRule } from '../lib/rules/skill-structure-rule.ts';

const marketplace = new Marketplace(process.argv[2] ?? '.');

const failedDirectories = new ClaudePluginValidation().failedDirectories([
  marketplace.directory,
  ...marketplace.pluginDirectories(),
]);

const skills = marketplace.skills();
const violations = new RuleValidator([
  new SkillStructureRule(),
  new SkillFrontmatterRule(),
  new ReferencesAreMarkdownRule(),
  new MaxLineCountRule(500),
]).validate(skills);

console.log('\nsorting-hat: skill rules');
for (const violation of violations) {
  console.error(`✗ ${violation.skill} [${violation.rule}] ${violation.message}`);
}

if (violations.length > 0) {
  console.error(`\n${violations.length} violation(s) in ${skills.length} skills`);
} else {
  console.log(`✓ ${skills.length} skills pass all rules`);
}

if (failedDirectories.length > 0) {
  console.error(`✗ claude plugin validate failed for ${failedDirectories.join(', ')}`);
}

if (violations.length > 0 || failedDirectories.length > 0) process.exitCode = 1;
