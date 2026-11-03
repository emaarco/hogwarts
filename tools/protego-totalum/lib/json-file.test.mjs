import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonFile } from './json-file.mjs';

function temporaryPath(fileName) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'protego-totalum-')), fileName);
}

test('reads nothing from a file that does not exist', () => {
  assert.equal(new JsonFile(temporaryPath('settings.json')).read(), undefined);
});

test('writes pretty printed JSON with a trailing newline and reads it back', () => {
  const settingsFile = new JsonFile(temporaryPath('settings.json'));

  settingsFile.write({ sandbox: { enabled: true } });

  assert.equal(fs.readFileSync(settingsFile.path, 'utf8'), '{\n  "sandbox": {\n    "enabled": true\n  }\n}\n');
  assert.deepEqual(settingsFile.read(), { sandbox: { enabled: true } });
});

test('refuses to read invalid JSON and leaves the file as it is', () => {
  const settingsPath = temporaryPath('settings.json');
  fs.writeFileSync(settingsPath, '{ "model": "opus", }');

  assert.throws(() => new JsonFile(settingsPath).read(), /settings\.json is not valid JSON/);
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), '{ "model": "opus", }');
});
