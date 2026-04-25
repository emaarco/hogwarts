import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { resolveLogPath } from './resolve-log-path.js';

test('returns project-scoped path when CLAUDE_PROJECT_DIR is set', () => {
  const result = resolveLogPath({ CLAUDE_PROJECT_DIR: '/tmp/project' });
  assert.equal(result, path.join('/tmp/project', '.claude', 'logs', 'revelio.jsonl'));
});

test('falls back to homedir when CLAUDE_PROJECT_DIR is unset', () => {
  const result = resolveLogPath({});
  assert.equal(result, path.join(os.homedir(), '.claude', 'logs', 'revelio.jsonl'));
});

test('falls back to homedir when CLAUDE_PROJECT_DIR is empty string', () => {
  const result = resolveLogPath({ CLAUDE_PROJECT_DIR: '' });
  assert.equal(result, path.join(os.homedir(), '.claude', 'logs', 'revelio.jsonl'));
});

test('falls back to homedir when CLAUDE_PROJECT_DIR is only whitespace', () => {
  const result = resolveLogPath({ CLAUDE_PROJECT_DIR: '   ' });
  assert.equal(result, path.join(os.homedir(), '.claude', 'logs', 'revelio.jsonl'));
});
