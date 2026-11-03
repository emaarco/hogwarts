import fs from 'node:fs';
import path from 'node:path';

export class RulesFolder {
  #directory;

  constructor(directory) {
    this.#directory = directory;
  }

  ruleFileNames() {
    if (!fs.existsSync(this.#directory)) return [];
    return fs.readdirSync(this.#directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name);
  }

  contains(fileName) {
    return fs.existsSync(this.#pathOf(fileName));
  }

  read(fileName) {
    return fs.readFileSync(this.#pathOf(fileName), 'utf8');
  }

  write(fileName, content) {
    fs.mkdirSync(this.#directory, { recursive: true });
    fs.writeFileSync(this.#pathOf(fileName), content);
  }

  remove(fileName) {
    fs.rmSync(this.#pathOf(fileName));
  }

  #pathOf(fileName) {
    return path.join(this.#directory, fileName);
  }
}
