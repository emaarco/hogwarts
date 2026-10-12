import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRules } from './lib/load-rules.js';
import { injectedRuleNames, markInjected } from './lib/injected-rules.js';

const rulesDirectory = fileURLToPath(new URL('../rules', import.meta.url));

function projectRelativePath(filePath, projectDirectory) {
  const relativePath = path.relative(projectDirectory, filePath);
  const isInsideProject = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  return (isInsideProject ? relativePath : filePath).split(path.sep).join('/');
}

function rulesFor(filePath) {
  return loadRules(rulesDirectory)
    .filter((rule) => rule.paths.some((glob) => path.matchesGlob(filePath, glob)));
}

function addRulesToContext(filePath, ruleText) {
  return {
    hookEventName: 'PreToolUse',
    additionalContext: `Follow these rules when you change ${filePath}:\n\n${ruleText}`,
  };
}

function denyWriteUntilRulesAreKnown(toolName, filePath, ruleText) {
  return {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: `These rules apply to ${filePath} and were not in your context yet. Repeat the ${toolName} call so that it follows them:\n\n${ruleText}`,
  };
}

function injectMissingRules(input) {
  const filePath = projectRelativePath(input.tool_input.file_path, process.env.CLAUDE_PROJECT_DIR ?? input.cwd);
  const context = { sessionId: input.session_id, agentId: input.agent_id ?? 'main' };
  const alreadyInjected = injectedRuleNames(context);
  const missingRules = rulesFor(filePath).filter((rule) => !alreadyInjected.includes(rule.name));
  if (missingRules.length === 0) return;

  markInjected(context, missingRules.map((rule) => rule.name));
  const ruleText = missingRules.map((rule) => rule.body).join('\n\n');
  const answerToClaudeCode = input.tool_name === 'Read'
    ? addRulesToContext(filePath, ruleText)
    : denyWriteUntilRulesAreKnown(input.tool_name, filePath, ruleText);
  process.stdout.write(JSON.stringify({ hookSpecificOutput: answerToClaudeCode }));
}

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (input.tool_input?.file_path && input.session_id) injectMissingRules(input);
} catch {
  process.exitCode = 0;
}
