import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { remindedRuleNames, rememberReminders } from './lib/reminder-memory.js';

const script = fileURLToPath(new URL('./forget-reminders.js', import.meta.url));

function runHook(input) {
  return spawnSync('node', [script], { input, encoding: 'utf8' });
}

test('forgets the reminders of the compacted session', () => {
  const mainAgent = { sessionId: randomUUID(), agentId: 'main' };
  rememberReminders(mainAgent, ['kotlin-style']);

  const result = runHook(JSON.stringify({ hook_event_name: 'SessionStart', source: 'compact', session_id: mainAgent.sessionId }));

  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);
  assert.deepEqual(remindedRuleNames(mainAgent), []);
});

test('exits 0 on malformed stdin', () => {
  assert.equal(runHook('not json {{{').status, 0);
});
