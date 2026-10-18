import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const stateDirectory = path.join(os.tmpdir(), 'imperio');

function stateFile(sessionId) {
  return path.join(stateDirectory, `${sessionId}.json`);
}

function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf8'));
  } catch {
    return {};
  }
}

export function injectedRuleNames({ sessionId, agentId }) {
  return readState(sessionId)[agentId] ?? [];
}

export function markInjected({ sessionId, agentId }, ruleNames) {
  const state = readState(sessionId);
  state[agentId] = [...(state[agentId] ?? []), ...ruleNames];
  fs.mkdirSync(stateDirectory, { recursive: true });
  fs.writeFileSync(stateFile(sessionId), JSON.stringify(state));
}

export function resetInjectedRules(sessionId) {
  fs.rmSync(stateFile(sessionId), { force: true });
}
