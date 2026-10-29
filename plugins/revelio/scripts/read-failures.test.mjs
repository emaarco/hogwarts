import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectFailures, transcriptDirFor } from './read-failures.mjs';

function writeTranscript(dir, name, entries) {
  const lines = entries.map(entry => (typeof entry === 'string' ? entry : JSON.stringify(entry)));
  fs.writeFileSync(path.join(dir, name), `${lines.join('\n')}\n`);
}

function toolUse(id, name, input, timestamp) {
  return { type: 'assistant', timestamp, sessionId: 's1', message: { content: [{ type: 'tool_use', id, name, input }] } };
}

function toolResult(id, content, timestamp, extra = {}) {
  return { type: 'user', timestamp, sessionId: 's1', ...extra, message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error: true }] } };
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-'));
}

test('transcriptDirFor encodes the project path like Claude Code', () => {
  assert.equal(transcriptDirFor('/Users/me/my.repo', '/home'), '/home/.claude/projects/-Users-me-my-repo');
});

test('collects tool errors with tool name and input, newest first', async () => {
  const dir = tempDir();
  writeTranscript(dir, 'a.jsonl', [
    toolUse('t1', 'Bash', { command: 'pnpm test' }, '2026-01-01T10:00:00Z'),
    toolResult('t1', 'Exit code 1', '2026-01-01T10:00:01Z'),
    toolUse('t2', 'Read', { file_path: '/x' }, '2026-01-01T11:00:00Z'),
    toolResult('t2', [{ type: 'text', text: 'File does not exist.' }], '2026-01-01T11:00:01Z'),
  ]);

  const records = await collectFailures(dir);

  assert.deepEqual(records.map(r => [r.kind, r.tool, r.error]), [
    ['tool-error', 'Read', 'File does not exist.'],
    ['tool-error', 'Bash', 'Exit code 1'],
  ]);
  assert.equal(records[1].input, '{"command":"pnpm test"}');
});

test('classifies rejections, auto-mode denials and API errors', async () => {
  const dir = tempDir();
  writeTranscript(dir, 'a.jsonl', [
    toolUse('t1', 'Write', {}, '2026-01-01T10:00:00Z'),
    toolResult('t1', "The user doesn't want to proceed with this tool use.", '2026-01-01T10:00:01Z', { toolDenialKind: 'user-rejected' }),
    toolUse('t2', 'Bash', {}, '2026-01-01T10:01:00Z'),
    toolResult('t2', 'Permission for this action was denied by the Claude Code auto mode classifier.', '2026-01-01T10:01:01Z'),
    { type: 'assistant', timestamp: '2026-01-01T10:02:00Z', sessionId: 's1', isApiErrorMessage: true, error: 'rate_limit', message: { content: [{ type: 'text', text: 'API Error: 429' }] } },
  ]);

  const kinds = (await collectFailures(dir)).map(r => r.kind);

  assert.deepEqual(kinds, ['api-error', 'automode-blocked', 'user-rejected']);
});

test('skips malformed lines and applies filters', async () => {
  const dir = tempDir();
  writeTranscript(dir, 'a.jsonl', [
    'not json',
    toolResult('t1', 'early', '2026-01-01T09:00:00Z'),
    toolResult('t2', 'late', '2026-01-02T09:00:00Z'),
    toolResult('t3', 'other session', '2026-01-02T10:00:00Z', { sessionId: 's2' }),
  ]);

  assert.deepEqual((await collectFailures(dir, { since: '2026-01-02', session: 's1' })).map(r => r.error), ['late']);
  assert.deepEqual((await collectFailures(dir, { limit: 1 })).map(r => r.error), ['other session']);
});

test('ignores entries that are not messages, such as request blobs', async () => {
  const dir = tempDir();
  writeTranscript(dir, 'a.jsonl', [
    toolResult('t1', 'real', '2026-01-01T10:00:00Z'),
    { ...toolResult('t1', 'duplicate', undefined), type: 'api-request-blob' },
  ]);

  assert.deepEqual((await collectFailures(dir)).map(r => r.error), ['real']);
});

test('returns nothing when the project has no transcripts', async () => {
  assert.deepEqual(await collectFailures(path.join(tempDir(), 'missing')), []);
});
