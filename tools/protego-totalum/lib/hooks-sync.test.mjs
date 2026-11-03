import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HooksSync } from './hooks-sync.mjs';

function directoryWith(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-'));
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, fileName), content);
  }
  return directory;
}

function syncHooks({ shippedDirectory, installedDirectory }) {
  return new HooksSync({ shippedDirectory, installedDirectory }).run();
}

test('installs every shipped hook file into a folder that does not exist yet', () => {
  const shippedDirectory = directoryWith({ 'patronum-hook.sh': 'echo hook\n' });
  const installedDirectory = path.join(directoryWith({}), 'hooks', 'protego-totalum');

  const report = syncHooks({ shippedDirectory, installedDirectory });

  assert.deepEqual(report.added, ['patronum-hook.sh']);
  assert.equal(fs.readFileSync(path.join(installedDirectory, 'patronum-hook.sh'), 'utf8'), 'echo hook\n');
});

test('overwrites changed files, keeps equal ones and removes files that are no longer shipped', () => {
  const shippedDirectory = directoryWith({ 'patronum-hook.sh': 'echo new\n', 'patronum.json': '{}\n' });
  const installedDirectory = directoryWith({ 'patronum-hook.sh': 'echo old\n', 'patronum.json': '{}\n', 'retired.sh': 'echo\n' });

  const report = syncHooks({ shippedDirectory, installedDirectory });

  assert.deepEqual(report, { added: [], updated: ['patronum-hook.sh'], unchanged: ['patronum.json'], removed: ['retired.sh'] });
  assert.deepEqual(fs.readdirSync(installedDirectory).sort(), ['patronum-hook.sh', 'patronum.json']);
  assert.equal(fs.readFileSync(path.join(installedDirectory, 'patronum-hook.sh'), 'utf8'), 'echo new\n');
});
