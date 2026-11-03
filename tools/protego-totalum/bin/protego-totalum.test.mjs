import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./protego-totalum.mjs', import.meta.url));
const shippedHooksDirectory = fileURLToPath(new URL('../hooks', import.meta.url));

function runProtegoTotalum(claudeConfigDirectory) {
  return spawnSync('node', [cli], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: claudeConfigDirectory },
    encoding: 'utf8',
  });
}

function readSettings(claudeConfigDirectory) {
  return JSON.parse(fs.readFileSync(path.join(claudeConfigDirectory, 'settings.json'), 'utf8'));
}

test('installs the hooks and registers them with their installed path next to the settings of the user', () => {
  const claudeConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-config-'));
  fs.writeFileSync(path.join(claudeConfigDirectory, 'settings.json'), '{ "model": "opus" }');

  const result = runProtegoTotalum(claudeConfigDirectory);

  assert.equal(result.status, 0, result.stderr);
  const installedHooksDirectory = path.join(claudeConfigDirectory, 'hooks', 'protego-totalum');
  assert.deepEqual(fs.readdirSync(installedHooksDirectory).sort(), fs.readdirSync(shippedHooksDirectory).sort());
  const settings = readSettings(claudeConfigDirectory);
  assert.equal(settings.model, 'opus');
  assert.equal(settings.sandbox.enabled, true);
  assert.equal(
    settings.hooks.PreToolUse[0].hooks[0].command,
    `bash "${path.join(installedHooksDirectory, 'patronum-hook.sh')}"`,
  );
});

test('a second run changes nothing', () => {
  const claudeConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-config-'));
  runProtegoTotalum(claudeConfigDirectory);

  const result = runProtegoTotalum(claudeConfigDirectory);

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /added|updated|removed|skipped/);
});

test('stops without writing anything when the settings file is not valid JSON', () => {
  const claudeConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-config-'));
  fs.writeFileSync(path.join(claudeConfigDirectory, 'settings.json'), '{ "model": "opus", }');

  const result = runProtegoTotalum(claudeConfigDirectory);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /is not valid JSON/);
  assert.deepEqual(fs.readdirSync(claudeConfigDirectory), ['settings.json']);
});
