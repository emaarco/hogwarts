import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readStdin } from './read-stdin.js';

function streamOf(text) {
  const s = Readable.from([text]);
  s.isTTY = false;
  return s;
}

test('parses valid JSON from stdin', async () => {
  const result = await readStdin(streamOf('{"hook_event_name":"PostToolUseFailure","tool_name":"Bash"}'));
  assert.deepEqual(result, { hook_event_name: 'PostToolUseFailure', tool_name: 'Bash' });
});

test('returns null on invalid JSON', async () => {
  const result = await readStdin(streamOf('not json {{{'));
  assert.equal(result, null);
});

test('returns null on empty stdin', async () => {
  const result = await readStdin(streamOf(''));
  assert.equal(result, null);
});

test('returns null when stream is a TTY', async () => {
  const s = Readable.from([]);
  s.isTTY = true;
  const result = await readStdin(s);
  assert.equal(result, null);
});
