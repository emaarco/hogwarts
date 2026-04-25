import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./log-api-failure.js', import.meta.url));

function runHook(payload, projectDir) {
  return spawnSync('node', [script], {
    input: payload === undefined ? '' : JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
}

function tmpProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-api-'));
}

test('appends a normalized record for StopFailure', () => {
  const dir = tmpProjectDir();
  const result = runHook({
    hook_event_name: 'StopFailure',
    session_id: 's-2',
    cwd: '/workdir',
    stop_reason: 'rate_limit',
    error: 'Too many requests',
  }, dir);

  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);

  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);

  const record = JSON.parse(lines[0]);
  assert.equal(record.event, 'StopFailure');
  assert.equal(record.session_id, 's-2');
  assert.equal(record.cwd, '/workdir');
  assert.equal(record.stop_reason, 'rate_limit');
  assert.equal(record.error, 'Too many requests');
  assert.ok(record.timestamp);
});

test('handles missing optional fields without crashing', () => {
  const dir = tmpProjectDir();
  const result = runHook({
    hook_event_name: 'StopFailure',
    stop_reason: 'unknown',
  }, dir);

  assert.equal(result.status, 0);
  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const record = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
  assert.equal(record.event, 'StopFailure');
  assert.equal(record.stop_reason, 'unknown');
});

test('exits 0 on malformed stdin without writing', () => {
  const dir = tmpProjectDir();
  const result = spawnSync('node', [script], {
    input: 'garbage',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(path.join(dir, '.claude', 'logs', 'revelio.jsonl')), false);
});
