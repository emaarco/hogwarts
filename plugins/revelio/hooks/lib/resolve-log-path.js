import path from 'node:path';
import os from 'node:os';

export function resolveLogPath(env = process.env) {
  const projectDir = env.CLAUDE_PROJECT_DIR;
  if (projectDir && projectDir.trim()) {
    return path.join(projectDir, '.claude', 'logs', 'revelio.jsonl');
  }
  return path.join(os.homedir(), '.claude', 'logs', 'revelio.jsonl');
}
