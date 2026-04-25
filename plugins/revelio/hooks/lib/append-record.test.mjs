import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { appendRecord } from './append-record.js';

function tmpLog() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-append-'));
  return path.join(dir, '.claude', 'logs', 'revelio.jsonl');
}

test('creates missing parent directories', () => {
  const logPath = tmpLog();
  appendRecord(logPath, { event: 'X' });
  assert.ok(fs.existsSync(logPath));
});

test('appends a newline-terminated JSON line', () => {
  const logPath = tmpLog();
  appendRecord(logPath, { event: 'PostToolUseFailure', tool: 'Bash' });
  const content = fs.readFileSync(logPath, 'utf8');
  assert.equal(content, '{"event":"PostToolUseFailure","tool":"Bash"}\n');
});

test('preserves existing lines across multiple calls', () => {
  const logPath = tmpLog();
  appendRecord(logPath, { n: 1 });
  appendRecord(logPath, { n: 2 });
  appendRecord(logPath, { n: 3 });
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((l) => JSON.parse(l).n), [1, 2, 3]);
});

test('does not throw when directory cannot be created', () => {
  assert.doesNotThrow(() => {
    appendRecord('/this/path/should/not/be/writable/revelio.jsonl', { event: 'X' });
  });
});
