import fs from 'node:fs';
import path from 'node:path';

export function appendRecord(logPath, record) {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(record) + '\n');
  } catch {
    // Logging must never block Claude.
  }
}
