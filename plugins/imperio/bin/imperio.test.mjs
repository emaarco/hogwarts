import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./imperio.mjs', import.meta.url));
const shippedRulesDirectory = fileURLToPath(new URL('../rules', import.meta.url));

function runImperio(claudeConfigDirectory) {
  const result = spawnSync('node', [cli], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: claudeConfigDirectory },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('installs every shipped rule into the rules folder of the Claude config directory', () => {
  const claudeConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'imperio-config-'));

  const output = runImperio(claudeConfigDirectory);

  for (const fileName of fs.readdirSync(shippedRulesDirectory)) {
    const installedRule = fs.readFileSync(path.join(claudeConfigDirectory, 'rules', fileName), 'utf8');
    assert.match(installedRule, /^---\ncursed-by: imperio\npaths:\n/);
    assert.match(output, new RegExp(`added\\s+${fileName}`));
  }
});

test('a second run changes nothing', () => {
  const claudeConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'imperio-config-'));
  runImperio(claudeConfigDirectory);

  const output = runImperio(claudeConfigDirectory);

  assert.doesNotMatch(output, /added|updated|removed|skipped/);
});
