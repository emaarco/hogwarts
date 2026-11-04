import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Skill } from './skill.ts';

type MarketplaceManifest = {
  plugins: { source: string }[];
};

export class Marketplace {
  readonly directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  pluginDirectories(): string[] {
    const manifestPath = join(this.directory, '.claude-plugin', 'marketplace.json');
    const manifest: MarketplaceManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return manifest.plugins.map((plugin) => join(this.directory, plugin.source));
  }

  skills(): Skill[] {
    return this.pluginDirectories()
      .map((pluginDirectory) => join(pluginDirectory, 'skills'))
      .filter((skillsDirectory) => existsSync(skillsDirectory))
      .flatMap((skillsDirectory) => Marketplace.#skillsIn(skillsDirectory));
  }

  static #skillsIn(skillsDirectory: string): Skill[] {
    return readdirSync(skillsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => new Skill(join(skillsDirectory, entry.name)));
  }
}
