import fs from 'node:fs';
import path from 'node:path';

export class HooksSync {
  #shippedDirectory;
  #installedDirectory;

  constructor({ shippedDirectory, installedDirectory }) {
    this.#shippedDirectory = shippedDirectory;
    this.#installedDirectory = installedDirectory;
  }

  run() {
    const shippedFileNames = HooksSync.#fileNamesIn(this.#shippedDirectory);
    const report = { added: [], updated: [], unchanged: [], removed: [] };
    for (const fileName of HooksSync.#fileNamesIn(this.#installedDirectory)) {
      if (shippedFileNames.includes(fileName)) continue;
      fs.rmSync(path.join(this.#installedDirectory, fileName));
      report.removed.push(fileName);
    }
    for (const fileName of shippedFileNames) {
      report[this.#install(fileName)].push(fileName);
    }
    return report;
  }

  #install(fileName) {
    const shippedContent = fs.readFileSync(path.join(this.#shippedDirectory, fileName), 'utf8');
    const installedPath = path.join(this.#installedDirectory, fileName);
    if (!fs.existsSync(installedPath)) {
      fs.mkdirSync(this.#installedDirectory, { recursive: true });
      fs.writeFileSync(installedPath, shippedContent);
      return 'added';
    }
    if (fs.readFileSync(installedPath, 'utf8') === shippedContent) return 'unchanged';
    fs.writeFileSync(installedPath, shippedContent);
    return 'updated';
  }

  static #fileNamesIn(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  }
}
