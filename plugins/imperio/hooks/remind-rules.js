import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readStdin } from './lib/read-stdin.js';
import { loadRules } from './lib/load-rules.js';
import { matchesGlob } from './lib/matches-glob.js';
import { remindedRuleNames, rememberReminders } from './lib/reminder-memory.js';

const rulesDirectory = fileURLToPath(new URL('../rules', import.meta.url));

function projectRelativePath(filePath, projectDirectory) {
  const relativePath = path.relative(projectDirectory, filePath);
  const isInsideProject = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  return (isInsideProject ? relativePath : filePath).split(path.sep).join('/');
}

function rulesFor(filePath) {
  return loadRules(rulesDirectory)
    .filter((rule) => rule.paths.some((glob) => matchesGlob(filePath, glob)));
}

function reminder(toolName, filePath, rules) {
  const ruleText = rules.map((rule) => rule.body).join('\n\n');
  if (toolName === 'Read') {
    return {
      hookEventName: 'PreToolUse',
      additionalContext: `Follow these rules when you change ${filePath}:\n\n${ruleText}`,
    };
  }
  return {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: `These rules apply to ${filePath} and were not in your context yet. Repeat the ${toolName} call so that it follows them:\n\n${ruleText}`,
  };
}

function remindOfPendingRules(input) {
  const filePath = projectRelativePath(input.tool_input.file_path, process.env.CLAUDE_PROJECT_DIR ?? input.cwd);
  const context = { sessionId: input.session_id, agentId: input.agent_id ?? 'main' };
  const alreadyReminded = remindedRuleNames(context);
  const pendingRules = rulesFor(filePath).filter((rule) => !alreadyReminded.includes(rule.name));
  if (pendingRules.length === 0) return;

  rememberReminders(context, pendingRules.map((rule) => rule.name));
  process.stdout.write(JSON.stringify({ hookSpecificOutput: reminder(input.tool_name, filePath, pendingRules) }));
}

try {
  const input = await readStdin();
  if (input?.tool_input?.file_path && input.session_id) remindOfPendingRules(input);
} catch {
  process.exitCode = 0;
}
