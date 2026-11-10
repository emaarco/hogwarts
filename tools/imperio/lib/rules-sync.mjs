const IMPERIO_CURSE = 'cursed-by: imperio';
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export class RulesSync {
  #shippedRules;
  #installedRules;

  constructor({ shippedRules, installedRules }) {
    this.#shippedRules = shippedRules;
    this.#installedRules = installedRules;
  }

  run() {
    const report = { added: [], updated: [], unchanged: [], removed: this.#removeRetiredRules(), skipped: [] };
    for (const fileName of this.#shippedRules.ruleFileNames()) {
      report[this.#installRule(fileName)].push(fileName);
    }
    return report;
  }

  #removeRetiredRules() {
    const shippedRuleNames = this.#shippedRules.ruleFileNames();
    const retiredRuleNames = this.#installedRules.ruleFileNames()
      .filter((fileName) => !shippedRuleNames.includes(fileName))
      .filter((fileName) => RulesSync.#isCursed(this.#installedRules.read(fileName)));
    for (const fileName of retiredRuleNames) this.#installedRules.remove(fileName);
    return retiredRuleNames;
  }

  #installRule(fileName) {
    const cursedContent = RulesSync.#curse(this.#shippedRules.read(fileName));
    if (!this.#installedRules.contains(fileName)) {
      this.#installedRules.write(fileName, cursedContent);
      return 'added';
    }
    const installedContent = this.#installedRules.read(fileName);
    if (!RulesSync.#isCursed(installedContent)) return 'skipped';
    if (installedContent === cursedContent) return 'unchanged';
    this.#installedRules.write(fileName, cursedContent);
    return 'updated';
  }

  static #isCursed(content) {
    const [, frontmatter = ''] = content.match(FRONTMATTER) ?? [];
    return frontmatter.split(/\r?\n/).some((line) => line.trim() === IMPERIO_CURSE);
  }

  static #curse(content) {
    const [openingFence] = content.match(/^---\r?\n/) ?? [];
    if (!openingFence) return `---\n${IMPERIO_CURSE}\n---\n\n${content}`;
    const lineEnding = openingFence.slice('---'.length);
    return `${openingFence}${IMPERIO_CURSE}${lineEnding}${content.slice(openingFence.length)}`;
  }
}
