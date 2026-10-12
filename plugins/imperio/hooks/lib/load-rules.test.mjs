import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadRules } from './load-rules.js';

function rulesDirectoryWith(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'imperio-rules-'));
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, fileName), content);
  }
  return directory;
}

test('reads name, paths and body of a rule', () => {
  const directory = rulesDirectoryWith({
    'typescript-style.md': '---\npaths:\n  - "**/*.ts"\n  - \'**/*.tsx\'\n---\n\n# TypeScript\n\n- Use full names.\n',
  });

  assert.deepEqual(loadRules(directory), [
    { name: 'typescript-style', paths: ['**/*.ts', '**/*.tsx'], body: '# TypeScript\n\n- Use full names.' },
  ]);
});

test('a file without frontmatter has no paths', () => {
  const directory = rulesDirectoryWith({ 'notes.md': '# Notes\n\n- not a rule\n' });

  assert.deepEqual(loadRules(directory)[0].paths, []);
});

test('ignores files that are not markdown', () => {
  const directory = rulesDirectoryWith({ 'rules.json': '{}' });

  assert.deepEqual(loadRules(directory), []);
});
