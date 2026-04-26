import fs from 'node:fs';
import path from 'node:path';

const ENTRY = '.claude/logs/';

try {
  const projectDir = process.env.CLAUDE_PROJECT_DIR?.trim();
  if (projectDir) {
    const gitignorePath = path.join(projectDir, '.gitignore');
    const existing = fs.existsSync(gitignorePath)
      ? fs.readFileSync(gitignorePath, 'utf8')
      : '';
    const lines = existing.split('\n').map(l => l.trim());
    if (!lines.includes(ENTRY)) {
      const suffix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
      fs.writeFileSync(gitignorePath, existing + suffix + ENTRY + '\n');
    }
  }
} catch {
  // Never block Claude.
}
process.exit(0);
