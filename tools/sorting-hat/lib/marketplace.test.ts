import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Marketplace } from './marketplace.ts';

function createMarketplace(pluginSources: string[]): string {
  const marketplaceDirectory = mkdtempSync(join(tmpdir(), 'marketplace-'));
  mkdirSync(join(marketplaceDirectory, '.claude-plugin'));
  const manifest = { plugins: pluginSources.map((source) => ({ source })) };
  writeFileSync(join(marketplaceDirectory, '.claude-plugin', 'marketplace.json'), JSON.stringify(manifest));
  return marketplaceDirectory;
}

test('resolves every registered plugin relative to the marketplace', () => {
  const marketplaceDirectory = createMarketplace(['./plugins/first', './plugins/second']);

  assert.deepEqual(new Marketplace(marketplaceDirectory).pluginDirectories(), [
    join(marketplaceDirectory, 'plugins/first'),
    join(marketplaceDirectory, 'plugins/second'),
  ]);
});

test('collects the skills of every plugin and skips plugins without skills', () => {
  const marketplaceDirectory = createMarketplace(['./plugins/with-skills', './plugins/without-skills']);
  mkdirSync(join(marketplaceDirectory, 'plugins/with-skills/skills/first-skill'), { recursive: true });
  mkdirSync(join(marketplaceDirectory, 'plugins/with-skills/skills/second-skill'));
  mkdirSync(join(marketplaceDirectory, 'plugins/without-skills'), { recursive: true });

  const skillNames = new Marketplace(marketplaceDirectory).skills().map((skill) => skill.name).sort();

  assert.deepEqual(skillNames, ['first-skill', 'second-skill']);
});
