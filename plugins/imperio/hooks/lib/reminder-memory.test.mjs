import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { remindedRuleNames, rememberReminders, forgetReminders } from './reminder-memory.js';

test('remembers reminders per agent of a session', () => {
  const sessionId = randomUUID();
  const mainAgent = { sessionId, agentId: 'main' };
  const subagent = { sessionId, agentId: 'agent-1' };

  rememberReminders(mainAgent, ['kotlin-style']);
  rememberReminders(mainAgent, ['typescript-style']);

  assert.deepEqual(remindedRuleNames(mainAgent), ['kotlin-style', 'typescript-style']);
  assert.deepEqual(remindedRuleNames(subagent), []);
});

test('forgets every reminder of a session', () => {
  const sessionId = randomUUID();
  const mainAgent = { sessionId, agentId: 'main' };
  rememberReminders(mainAgent, ['kotlin-style']);

  forgetReminders(sessionId);

  assert.deepEqual(remindedRuleNames(mainAgent), []);
});

test('forgetting an unknown session does not throw', () => {
  forgetReminders(randomUUID());
});
