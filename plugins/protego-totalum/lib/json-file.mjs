import fs from 'node:fs';
import path from 'node:path';

export class JsonFile {
  #path;

  constructor(filePath) {
    this.#path = filePath;
  }

  get path() {
    return this.#path;
  }

  read() {
    if (!fs.existsSync(this.#path)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(this.#path, 'utf8'));
    } catch (error) {
      throw new Error(`${this.#path} is not valid JSON, fix it first: ${error.message}`);
    }
  }

  write(value) {
    fs.mkdirSync(path.dirname(this.#path), { recursive: true });
    fs.writeFileSync(this.#path, `${JSON.stringify(value, null, 2)}\n`);
  }
}
