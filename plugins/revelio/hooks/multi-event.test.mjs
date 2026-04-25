import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const hooksDir = fileURLToPath(new URL('.', import.meta.url));

function run(scriptName, payload, projectDir) {
  const result = spawnSync('node', [path.join(hooksDir, scriptName)], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${scriptName} exited ${result.status}: ${result.stderr}`);
}

test('all three hooks share one log file without collision', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-multi-'));

  run('log-tool-failure.js', {
    hook_event_name: 'PostToolUseFailure',
    session_id: 's',
    tool_name: 'Bash',
    tool_input: { command: 'false' },
    error: 'exit 1',
  }, dir);

  run('log-api-failure.js', {
    hook_event_name: 'StopFailure',
    session_id: 's',
    stop_reason: 'rate_limit',
    error: 'boom',
  }, dir);

  run('log-permission-denied.js', {
    hook_event_name: 'PermissionDenied',
    session_id: 's',
    tool_name: 'Write',
    tool_input: { file_path: '/etc/hosts' },
    reason: 'denied',
  }, dir);

  const logPath = path.join(dir, '.claude', 'logs', 'revelio.jsonl');
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 3);

  const events = lines.map((l) => JSON.parse(l).event);
  assert.deepEqual(events, ['PostToolUseFailure', 'StopFailure', 'PermissionDenied']);

  const timestamps = lines.map((l) => JSON.parse(l).timestamp);
  assert.ok(timestamps[0] <= timestamps[1]);
  assert.ok(timestamps[1] <= timestamps[2]);
});
