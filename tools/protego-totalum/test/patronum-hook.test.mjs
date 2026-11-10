import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('../hooks/patronum-hook.sh', import.meta.url));
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-home-'));

function runHook(toolCall, env = {}) {
  return spawnSync('/bin/bash', [hook], {
    input: JSON.stringify(toolCall),
    env: { ...process.env, HOME: home, ...env },
    encoding: 'utf8',
  });
}

function exitCodeFor(toolCall) {
  return runHook(toolCall).status;
}

const blockedToolCalls = {
  'Read ~/.ssh/id_rsa': { tool_name: 'Read', tool_input: { file_path: `${home}/.ssh/id_rsa` } },
  'Read .env': { tool_name: 'Read', tool_input: { file_path: '/project/.env' } },
  'Read ~/.aws/credentials': { tool_name: 'Read', tool_input: { file_path: `${home}/.aws/credentials` } },
  'Read server.pem': { tool_name: 'Read', tool_input: { file_path: '/project/certs/server.pem' } },
  'Write .env.local': { tool_name: 'Write', tool_input: { file_path: '/project/.env.local' } },
  'Edit .env': { tool_name: 'Edit', tool_input: { file_path: '/project/.env' } },
  'MultiEdit .env': { tool_name: 'MultiEdit', tool_input: { edits: [{ file_path: '/project/.env' }] } },
  'Bash printenv': { tool_name: 'Bash', tool_input: { command: 'printenv' } },
  'Bash printenv HOME': { tool_name: 'Bash', tool_input: { command: 'printenv HOME' } },
  'Read ~/.config/gh/hosts.yml': { tool_name: 'Read', tool_input: { file_path: `${home}/.config/gh/hosts.yml` } },
  'Read ~/.config/glab-cli/config.yml': { tool_name: 'Read', tool_input: { file_path: `${home}/.config/glab-cli/config.yml` } },
  'Read ~/.git-credentials': { tool_name: 'Read', tool_input: { file_path: `${home}/.git-credentials` } },
  'Read ~/.netrc': { tool_name: 'Read', tool_input: { file_path: `${home}/.netrc` } },
  'Read ~/.claude/.credentials.json': { tool_name: 'Read', tool_input: { file_path: `${home}/.claude/.credentials.json` } },
};

const allowedToolCalls = {
  'Read README.md': { tool_name: 'Read', tool_input: { file_path: '/project/README.md' } },
  'MultiEdit a safe file': { tool_name: 'MultiEdit', tool_input: { edits: [{ file_path: '/project/index.ts' }] } },
  'Bash ls -la': { tool_name: 'Bash', tool_input: { command: 'ls -la' } },
  'Bash env NODE_ENV=test npm run build': { tool_name: 'Bash', tool_input: { command: 'env NODE_ENV=test npm run build' } },
};

for (const [description, toolCall] of Object.entries(blockedToolCalls)) {
  test(`blocks ${description}`, () => {
    assert.equal(exitCodeFor(toolCall), 2);
  });
}

for (const [description, toolCall] of Object.entries(allowedToolCalls)) {
  test(`allows ${description}`, () => {
    assert.equal(exitCodeFor(toolCall), 0);
  });
}

test('blocks every tool call when jq is missing', () => {
  const result = runHook(allowedToolCalls['Read README.md'], { PATH: '/nonexistent' });
  assert.equal(result.status, 2);
});

test('logs a violation into CLAUDE_CONFIG_DIR when it is set', () => {
  const claudeConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-config-'));
  runHook(blockedToolCalls['Read .env'], { CLAUDE_CONFIG_DIR: claudeConfigDirectory });
  assert.match(fs.readFileSync(path.join(claudeConfigDirectory, 'patronum.log'), 'utf8'), /"pattern": "\*\*\/\.env"/);
});
