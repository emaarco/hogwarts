import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const IGNORED_ENTRIES = new Set(['.DS_Store']);
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const FRONTMATTER_FIELD = /^([\w-]+):\s*(.*)$/;

export class Skill {
  readonly name: string;
  readonly directory: string;

  constructor(directory: string) {
    this.directory = directory;
    this.name = basename(directory);
  }

  topLevelEntries(): string[] {
    return readdirSync(this.directory).filter((entry) => !IGNORED_ENTRIES.has(entry));
  }

  files(): string[] {
    return readdirSync(this.directory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && !IGNORED_ENTRIES.has(entry.name))
      .map((entry) => relative(this.directory, join(entry.parentPath, entry.name)))
      .sort();
  }

  has(relativePath: string): boolean {
    return existsSync(join(this.directory, relativePath));
  }

  read(relativePath: string): string {
    return readFileSync(join(this.directory, relativePath), 'utf8');
  }

  frontmatter(): Map<string, string> | undefined {
    const [, frontmatterBlock] = this.read('SKILL.md').match(FRONTMATTER) ?? [];
    if (frontmatterBlock === undefined) return undefined;
    const fields = new Map<string, string>();
    for (const line of frontmatterBlock.split(/\r?\n/)) {
      const [, key, value] = line.match(FRONTMATTER_FIELD) ?? [];
      if (key !== undefined) fields.set(key, Skill.#unquote(value.trim()));
    }
    return fields;
  }

  static #unquote(value: string): string {
    const isQuoted = /^(["']).*\1$/.test(value);
    return isQuoted ? value.slice(1, -1) : value;
  }
}
