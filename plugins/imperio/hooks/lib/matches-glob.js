const GLOB_TOKEN = /\*\*\/|\*\*|\*|\?|\{[^}]*\}|[.+^$()|[\]\\]/g;

function toRegExpSource(glob) {
  return glob.replace(GLOB_TOKEN, translateToken);
}

function translateToken(token) {
  if (token === '**/') return '(?:.*/)?';
  if (token === '**') return '.*';
  if (token === '*') return '[^/]*';
  if (token === '?') return '[^/]';
  if (token.startsWith('{')) {
    const alternatives = token.slice(1, -1).split(',');
    return `(?:${alternatives.map(toRegExpSource).join('|')})`;
  }
  return `\\${token}`;
}

export function matchesGlob(filePath, glob) {
  return new RegExp(`^${toRegExpSource(glob)}$`).test(filePath);
}
