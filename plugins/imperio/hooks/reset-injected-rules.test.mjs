import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./reset-injected-rules.js', import.meta.url));

test('exits 0 on malformed stdin', () => {
  assert.equal(spawnSync('node', [script], { input: 'not json {{{', encoding: 'utf8' }).status, 0);
});
