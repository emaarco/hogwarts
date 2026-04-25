import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./log-permission-denied.js', import.meta.url));

function runHook(payload, projectDir) {
  return spawnSync('node', [script], {
    input: payload === undefined ? '' : JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
}

function tmpProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-denied-'));
}

test('appends a normalized record for PermissionDenied', () => {
  const dir = tmpProjectDir();
  const result = runHook({
    hook_event_name: 'PermissionDenied',
    session_id: 's-3',
    cwd: '/workdir',
    tool_name: 'Write',
    tool_use_id: 'toolu_3',
    tool_input: { file_path: '/etc/hosts' },
    reason: 'auto-mode rejected: path outside project',
  }, dir);

  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);

  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);

  const record = JSON.parse(lines[0]);
  assert.equal(record.event, 'PermissionDenied');
  assert.equal(record.session_id, 's-3');
  assert.equal(record.tool_name, 'Write');
  assert.deepEqual(record.tool_input, { file_path: '/etc/hosts' });
  assert.equal(record.reason, 'auto-mode rejected: path outside project');
  assert.ok(record.timestamp);
});

test('falls back to permission_decision when reason is missing', () => {
  const dir = tmpProjectDir();
  runHook({
    hook_event_name: 'PermissionDenied',
    tool_name: 'Bash',
    permission_decision: 'deny',
  }, dir);

  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const record = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
  assert.equal(record.reason, 'deny');
});

test('exits 0 on malformed stdin without writing', () => {
  const dir = tmpProjectDir();
  const result = spawnSync('node', [script], {
    input: '',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(path.join(dir, '.claude', 'logs', 'revelio.jsonl')), false);
});
