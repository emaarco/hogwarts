import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesGlob } from './matches-glob.js';

test('** matches files at any depth, including the project root', () => {
  assert.equal(matchesGlob('Main.kt', '**/*.kt'), true);
  assert.equal(matchesGlob('src/main/kotlin/Main.kt', '**/*.kt'), true);
  assert.equal(matchesGlob('src/main/kotlin/Main.kts', '**/*.kt'), false);
});

test('* stays within one path segment', () => {
  assert.equal(matchesGlob('README.md', '*.md'), true);
  assert.equal(matchesGlob('docs/README.md', '*.md'), false);
});

test('a directory prefix limits the match to that directory', () => {
  assert.equal(matchesGlob('src/api/user.ts', 'src/**/*.ts'), true);
  assert.equal(matchesGlob('test/api/user.ts', 'src/**/*.ts'), false);
});

test('braces match any of the alternatives', () => {
  assert.equal(matchesGlob('src/App.tsx', '**/*.{ts,tsx}'), true);
  assert.equal(matchesGlob('src/App.jsx', '**/*.{ts,tsx}'), false);
});

test('a file name matches literally', () => {
  assert.equal(matchesGlob('packages/web/package.json', '**/package.json'), true);
  assert.equal(matchesGlob('packages/web/packageXjson', '**/package.json'), false);
});
