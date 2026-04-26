import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPT = new URL('./ensure-gitignore.js', import.meta.url).pathname;
const ENTRY = '.claude/logs/';

function run(env = {}) {
  execFileSync(process.execPath, [SCRIPT], { env: { ...process.env, ...env } });
}

describe('ensure-gitignore', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'revelio-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('no-op when CLAUDE_PROJECT_DIR is unset', () => {
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    execFileSync(process.execPath, [SCRIPT], { env });
    // No file written in tmpDir — nothing to assert beyond no throw.
  });

  it('creates .gitignore with entry when file is absent', () => {
    run({ CLAUDE_PROJECT_DIR: tmpDir });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8');
    assert.ok(content.split('\n').map(l => l.trim()).includes(ENTRY));
  });

  it('appends entry when .gitignore exists but lacks it', () => {
    const gitignorePath = path.join(tmpDir, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/\n.env\n');
    run({ CLAUDE_PROJECT_DIR: tmpDir });
    const content = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(content.split('\n').map(l => l.trim()).includes(ENTRY));
    assert.ok(content.includes('node_modules/'));
  });

  it('does not duplicate entry when already present', () => {
    const gitignorePath = path.join(tmpDir, '.gitignore');
    fs.writeFileSync(gitignorePath, `node_modules/\n${ENTRY}\n`);
    run({ CLAUDE_PROJECT_DIR: tmpDir });
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const matches = content.split('\n').filter(l => l.trim() === ENTRY);
    assert.equal(matches.length, 1);
  });
});
