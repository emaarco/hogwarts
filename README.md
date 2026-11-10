# 🏰 hogwarts

[![CI](https://github.com/emaarco/hogwarts/actions/workflows/validate-plugins.yml/badge.svg)](https://github.com/emaarco/hogwarts/actions/workflows/validate-plugins.yml)
[![License: MIT](https://img.shields.io/github/license/emaarco/hogwarts)](LICENSE)

**See what your agent failed at, keep it away from your secrets, give it a code style and hand off repo chores.**

hogwarts is a spellbook for Claude Code: a plugin marketplace plus two scripts that set up your `~/.claude`, each one spell that does one job, so you learn only the ones you need. 🪄

## 📖 The spellbook

- **🔍 Revelio, the revealing charm (plugin).** [Revelio](plugins/revelio/) lists your agent's failed tool calls, rejections and API errors in a repo and suggests a fix per recurring pattern.
- **🍀 Felix Felicis, liquid luck (plugin).** [Felix Felicis](plugins/felix-felicis/) audits a repo with `/maturity-analysis`, sets up branch protection, releases and CI on GitHub, and gets failing dependency update PRs green on GitHub and GitLab.
- **🛡️ Protego Totalum, the camp shield (script).** [Protego Totalum](tools/protego-totalum/) turns on Claude Code's [sandbox](https://code.claude.com/docs/en/sandboxing) in strict mode and blocks Claude's file tools from `.env` files, keys and credentials.
- **🌀 Imperio, the Imperius Curse (script).** [Imperio](tools/imperio/) installs style rules for Kotlin, TypeScript and `package.json` that Claude loads only when it touches matching files.

Together: **Protego guards, Revelio reveals, Imperio commands, Felix brings the luck.**

## ⚡ Install

**Plugins:** inside Claude Code, add the marketplace once (it registers as `emaarco`), then install the plugins you want.

```text
/plugin marketplace add emaarco/hogwarts
/plugin install revelio@emaarco
/plugin install felix-felicis@emaarco
```

**Scripts:** they change user settings, which a plugin cannot, so they run from a clone. They need Node 20 or later; Protego Totalum also needs [jq](https://jqlang.github.io/jq/), plus `bubblewrap` and `socat` on Linux, and does not support native Windows (use WSL2).

```bash
git clone https://github.com/emaarco/hogwarts.git
cd hogwarts
npx ./tools/protego-totalum
npx ./tools/imperio
```

Settings and rules you already have win over the shipped ones; rerun after `git pull` to update. Prefix a command with `CLAUDE_CONFIG_DIR=/tmp/claude-try` to practise on a scratch folder first. In strict mode, each host a repo needs must be allowlisted, as [Protego Totalum's README](tools/protego-totalum/) explains.

## 🪄 Your first spells

1. Cast `/revelio` in a repo to see what your agent failed at recently.
2. Cast `/maturity-analysis` there for a prioritized list of what the repo is missing.
3. Run Protego Totalum and Imperio, restart Claude Code, and ask it to read a `.env` file: the shield holds.

## 🦉 Help and feedback

- **Details:** each plugin and script has its own README, linked above.
- **Bugs and ideas:** send an owl, or [open an issue](https://github.com/emaarco/hogwarts/issues/new/choose).

## 🧹 Contributing

Repository layout, adding a plugin or script, and validation are in [CONTRIBUTING.md](CONTRIBUTING.md).

## 📜 License

[MIT](LICENSE) © Marco Schäck

---

_Mischief managed. Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm)._
