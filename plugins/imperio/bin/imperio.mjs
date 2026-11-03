#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RulesFolder } from '../lib/rules-folder.mjs';
import { RulesSync } from '../lib/rules-sync.mjs';

const claudeConfigDirectory = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
const targetDirectory = path.join(claudeConfigDirectory, 'rules');

const report = new RulesSync({
  shippedRules: new RulesFolder(fileURLToPath(new URL('../rules', import.meta.url))),
  installedRules: new RulesFolder(targetDirectory),
}).run();

console.log(`imperio: synced rules into ${targetDirectory}`);
for (const [outcome, fileNames] of Object.entries(report)) {
  for (const fileName of fileNames) console.log(`  ${outcome.padEnd(10)}${fileName}`);
}
if (report.skipped.length > 0) {
  console.log('\nSkipped files exist already and are not managed by imperio. Rename them to install the shipped rule.');
}
