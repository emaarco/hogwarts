import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSkill } from '../test-support/create-skill.ts';
import { ReferencesAreMarkdownRule } from './references-are-markdown-rule.ts';

const rule = new ReferencesAreMarkdownRule();

test('accepts Markdown in references/ and anything elsewhere', () => {
  const skill = createSkill('demo', { 'references/api.md': '', 'scripts/run.mjs': '', 'assets/config.json': '' });

  assert.deepEqual(rule.check(skill), []);
});

test('reports non-Markdown files in references/', () => {
  const skill = createSkill('demo', { 'references/run.mjs': '', 'references/config.json': '' });

  assert.deepEqual(rule.check(skill), [
    'references/config.json is not Markdown, move code to scripts/ and templates or data to assets/',
    'references/run.mjs is not Markdown, move code to scripts/ and templates or data to assets/',
  ]);
});
