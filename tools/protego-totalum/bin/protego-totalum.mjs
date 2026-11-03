#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HooksSync } from '../lib/hooks-sync.mjs';
import { JsonFile } from '../lib/json-file.mjs';
import { SettingsSync } from '../lib/settings-sync.mjs';

const claudeConfigDirectory = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
const hooksDirectory = path.join(claudeConfigDirectory, 'hooks', 'protego-totalum');
const settingsFile = new JsonFile(path.join(claudeConfigDirectory, 'settings.json'));

const shippedSettingsTemplate = fs.readFileSync(new URL('../settings.json', import.meta.url), 'utf8');
const shippedSettings = JSON.parse(
  shippedSettingsTemplate.replaceAll('{{hooksDirectory}}', JSON.stringify(hooksDirectory).slice(1, -1)),
);

const settingsReport = new SettingsSync({
  shippedSettings,
  settingsFile,
  lockFile: new JsonFile(path.join(claudeConfigDirectory, 'protego-totalum.lock.json')),
}).run();

const hooksReport = new HooksSync({
  shippedDirectory: fileURLToPath(new URL('../hooks', import.meta.url)),
  installedDirectory: hooksDirectory,
}).run();

console.log(`protego-totalum: synced hooks into ${hooksDirectory}`);
for (const [outcome, fileNames] of Object.entries(hooksReport)) {
  for (const fileName of fileNames) console.log(`  ${outcome.padEnd(10)}${fileName}`);
}
console.log(`protego-totalum: merged settings into ${settingsFile.path}`);
console.log(`  ${(settingsReport.changed ? 'updated' : 'unchanged').padEnd(10)}settings.json`);
for (const keyPath of settingsReport.skipped) console.log(`  ${'skipped'.padEnd(10)}${keyPath}`);
if (settingsReport.skipped.length > 0) {
  console.log('\nSkipped keys already hold a value of your own and stay as they are.');
}
