import { spawnSync } from 'node:child_process';

export class ClaudePluginValidation {
  failedDirectories(pluginOrMarketplaceDirectories: string[]): string[] {
    return pluginOrMarketplaceDirectories.filter((directory) => {
      const validation = spawnSync('claude', ['plugin', 'validate', directory], { stdio: 'inherit' });
      return validation.status !== 0;
    });
  }
}
