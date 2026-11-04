import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Skill } from '../skill.ts';

export function createSkill(name: string, files: Record<string, string>): Skill {
  const skillDirectory = join(mkdtempSync(join(tmpdir(), 'skill-')), name);
  mkdirSync(skillDirectory);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(skillDirectory, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  return new Skill(skillDirectory);
}

export function skillFile(name: string, description = 'Does something useful.'): string {
  return `---\nname: ${name}\ndescription: "${description}"\n---\n\n# ${name}\n`;
}
