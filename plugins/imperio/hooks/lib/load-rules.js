import fs from 'node:fs';
import path from 'node:path';

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const LIST_ITEM = /^\s*-\s+(.+)$/gm;

function unquote(value) {
  return value.trim().replace(/^["']|["']$/g, '');
}

function parseRule(fileName, content) {
  const [, frontmatter = '', body = ''] = content.match(FRONTMATTER) ?? [];
  return {
    name: path.basename(fileName, '.md'),
    paths: [...frontmatter.matchAll(LIST_ITEM)].map(([, listItem]) => unquote(listItem)),
    body: body.trim(),
  };
}

export function loadRules(rulesDirectory) {
  return fs.readdirSync(rulesDirectory)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => parseRule(fileName, fs.readFileSync(path.join(rulesDirectory, fileName), 'utf8')));
}
