import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const memoryDirectory = path.join(os.tmpdir(), 'imperio');

function memoryFile(sessionId) {
  return path.join(memoryDirectory, `${sessionId}.json`);
}

function readMemory(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(memoryFile(sessionId), 'utf8'));
  } catch {
    return {};
  }
}

export function remindedRuleNames({ sessionId, agentId }) {
  return readMemory(sessionId)[agentId] ?? [];
}

export function rememberReminders({ sessionId, agentId }, ruleNames) {
  const memory = readMemory(sessionId);
  memory[agentId] = [...(memory[agentId] ?? []), ...ruleNames];
  fs.mkdirSync(memoryDirectory, { recursive: true });
  fs.writeFileSync(memoryFile(sessionId), JSON.stringify(memory));
}

export function forgetReminders(sessionId) {
  fs.rmSync(memoryFile(sessionId), { force: true });
}
