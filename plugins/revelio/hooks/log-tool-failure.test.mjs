import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./log-tool-failure.js', import.meta.url));

function runHook(payload, projectDir) {
  const result = spawnSync('node', [script], {
    input: payload === undefined ? '' : JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
  return result;
}

function tmpProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-tool-'));
}

test('appends a normalized record for PostToolUseFailure', () => {
  const dir = tmpProjectDir();
  const result = runHook({
    hook_event_name: 'PostToolUseFailure',
    session_id: 's-1',
    cwd: '/workdir',
    tool_name: 'Bash',
    tool_use_id: 'toolu_1',
    tool_input: { command: 'false' },
    tool_response: { error: 'exited 1' },
  }, dir);

  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);

  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);

  const record = JSON.parse(lines[0]);
  assert.equal(record.event, 'PostToolUseFailure');
  assert.equal(record.session_id, 's-1');
  assert.equal(record.cwd, '/workdir');
  assert.equal(record.tool_name, 'Bash');
  assert.equal(record.tool_use_id, 'toolu_1');
  assert.deepEqual(record.tool_input, { command: 'false' });
  assert.equal(record.error, 'exited 1');
  assert.ok(record.timestamp);
});

test('prefers top-level error over tool_response.error', () => {
  const dir = tmpProjectDir();
  runHook({
    hook_event_name: 'PostToolUseFailure',
    tool_name: 'Bash',
    error: 'primary',
    tool_response: { error: 'secondary' },
  }, dir);

  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const record = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
  assert.equal(record.error, 'primary');
});

test('exits 0 on malformed stdin without writing a record', () => {
  const dir = tmpProjectDir();
  const result = spawnSync('node', [script], {
    input: 'not json {{{',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  assert.equal(fs.existsSync(logPath), false);
});
