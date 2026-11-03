import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RulesFolder } from './rules-folder.mjs';
import { RulesSync } from './rules-sync.mjs';

const kotlinRule = '---\npaths:\n  - "**/*.kt"\n---\n\n# Kotlin\n\n- Use named arguments.\n';
const installedKotlinRule = '---\ncursed-by: imperio\npaths:\n  - "**/*.kt"\n---\n\n# Kotlin\n\n- Use named arguments.\n';

function directoryWith(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'imperio-'));
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, fileName), content);
  }
  return directory;
}

function syncRules({ sourceDirectory, targetDirectory }) {
  return new RulesSync({
    shippedRules: new RulesFolder(sourceDirectory),
    installedRules: new RulesFolder(targetDirectory),
  }).run();
}

function read(directory, fileName) {
  return fs.readFileSync(path.join(directory, fileName), 'utf8');
}

test('installs every shipped rule with the imperio marker', () => {
  const sourceDirectory = directoryWith({ 'kotlin-style.md': kotlinRule });
  const targetDirectory = path.join(directoryWith({}), 'rules');

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.added, ['kotlin-style.md']);
  assert.equal(read(targetDirectory, 'kotlin-style.md'), installedKotlinRule);
});

test('adds the marker as frontmatter to a rule without frontmatter', () => {
  const sourceDirectory = directoryWith({ 'always.md': '# Always\n' });
  const targetDirectory = directoryWith({});

  syncRules({ sourceDirectory, targetDirectory });

  assert.equal(read(targetDirectory, 'always.md'), '---\ncursed-by: imperio\n---\n\n# Always\n');
});

test('overwrites a managed rule whose shipped version changed', () => {
  const sourceDirectory = directoryWith({ 'kotlin-style.md': kotlinRule });
  const targetDirectory = directoryWith({ 'kotlin-style.md': '---\ncursed-by: imperio\n---\n\n# Old\n' });

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.updated, ['kotlin-style.md']);
  assert.equal(read(targetDirectory, 'kotlin-style.md'), installedKotlinRule);
});

test('reports a managed rule that is up to date as unchanged', () => {
  const sourceDirectory = directoryWith({ 'kotlin-style.md': kotlinRule });
  const targetDirectory = directoryWith({ 'kotlin-style.md': installedKotlinRule });

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.unchanged, ['kotlin-style.md']);
});

test('removes a managed rule that is no longer shipped', () => {
  const sourceDirectory = directoryWith({});
  const targetDirectory = directoryWith({ 'retired.md': '---\ncursed-by: imperio\n---\n\n# Retired\n' });

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.removed, ['retired.md']);
  assert.equal(fs.existsSync(path.join(targetDirectory, 'retired.md')), false);
});

test('keeps rules that imperio does not manage', () => {
  const ownRule = '---\npaths:\n  - "**/*.py"\n---\n\n# My Python rule\n';
  const ruleMentioningImperioInBody = '# Notes\n\ncursed-by: imperio\n';
  const sourceDirectory = directoryWith({});
  const targetDirectory = directoryWith({ 'python.md': ownRule, 'notes.md': ruleMentioningImperioInBody });

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.removed, []);
  assert.equal(read(targetDirectory, 'python.md'), ownRule);
  assert.equal(read(targetDirectory, 'notes.md'), ruleMentioningImperioInBody);
});

test('skips a shipped rule whose file name is taken by an own rule', () => {
  const ownRule = '# My Kotlin rule\n';
  const sourceDirectory = directoryWith({ 'kotlin-style.md': kotlinRule });
  const targetDirectory = directoryWith({ 'kotlin-style.md': ownRule });

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.skipped, ['kotlin-style.md']);
  assert.equal(read(targetDirectory, 'kotlin-style.md'), ownRule);
});

test('leaves subdirectories and files that are not markdown alone', () => {
  const sourceDirectory = directoryWith({});
  const targetDirectory = directoryWith({ 'settings.json': '{}' });
  fs.mkdirSync(path.join(targetDirectory, 'team.md'));

  const report = syncRules({ sourceDirectory, targetDirectory });

  assert.deepEqual(report.removed, []);
  assert.equal(fs.existsSync(path.join(targetDirectory, 'settings.json')), true);
  assert.equal(fs.existsSync(path.join(targetDirectory, 'team.md')), true);
});
