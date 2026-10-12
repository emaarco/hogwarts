import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./remind-rules.js', import.meta.url));
const projectDirectory = '/workdir';

function runHook(payload) {
  const result = spawnSync('node', [script], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDirectory },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput : null;
}

function toolCall(toolName, filePath, sessionId, agentId) {
  return {
    hook_event_name: 'PreToolUse',
    session_id: sessionId,
    agent_id: agentId,
    cwd: projectDirectory,
    tool_name: toolName,
    tool_input: { file_path: filePath },
  };
}

test('adds the matching rule as context when a file is read', () => {
  const output = runHook(toolCall('Read', '/workdir/src/Main.kt', randomUUID()));

  assert.equal(output.hookEventName, 'PreToolUse');
  assert.equal(output.permissionDecision, undefined);
  assert.match(output.additionalContext, /src\/Main\.kt/);
  assert.match(output.additionalContext, /# Kotlin Code Style/);
  assert.doesNotMatch(output.additionalContext, /paths:/);
});

test('denies the first write to a file whose rule was not reminded yet', () => {
  const output = runHook(toolCall('Write', '/workdir/src/Main.kt', randomUUID()));

  assert.equal(output.permissionDecision, 'deny');
  assert.match(output.permissionDecisionReason, /Repeat the Write call/);
  assert.match(output.permissionDecisionReason, /# Kotlin Code Style/);
});

test('stays silent once a rule was reminded in the session', () => {
  const sessionId = randomUUID();
  runHook(toolCall('Read', '/workdir/src/Main.kt', sessionId));

  assert.equal(runHook(toolCall('Edit', '/workdir/src/Main.kt', sessionId)), null);
  assert.equal(runHook(toolCall('Write', '/workdir/src/Other.kt', sessionId)), null);
});

test('reminds a subagent separately from the main conversation', () => {
  const sessionId = randomUUID();
  runHook(toolCall('Read', '/workdir/src/Main.kt', sessionId));

  const output = runHook(toolCall('Edit', '/workdir/src/Main.kt', sessionId, 'agent-1'));

  assert.equal(output.permissionDecision, 'deny');
});

test('reminds of a second rule when another file type is touched', () => {
  const sessionId = randomUUID();
  runHook(toolCall('Read', '/workdir/src/Main.kt', sessionId));

  const output = runHook(toolCall('Read', '/workdir/web/src/App.tsx', sessionId));

  assert.match(output.additionalContext, /# TypeScript Code Style/);
  assert.doesNotMatch(output.additionalContext, /# Kotlin Code Style/);
});

test('matches files outside the project directory', () => {
  const output = runHook(toolCall('Read', '/elsewhere/package.json', randomUUID()));

  assert.match(output.additionalContext, /# package\.json Style/);
});

test('stays silent for files without a matching rule', () => {
  assert.equal(runHook(toolCall('Write', '/workdir/README.md', randomUUID())), null);
});

test('stays silent on malformed stdin', () => {
  assert.equal(runHook('not json {{{'), null);
});
