# hogwarts

> A Hogwarts for Claude Code — a spellbook of plugins that guard, reveal & automate. 🏰🪄

**hogwarts** is a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace. Instead of one big config, it bundles several small, focused plugins — each named after a spell or potion — that harden, observe, and automate your everyday agent workflows.

Add the marketplace once, then install only the spells you need.

## ⚡ Install

```bash
/plugin marketplace add emaarco/hogwarts     # once per machine
/plugin install <plugin>@emaarco             # e.g. agento-patronum@emaarco
```

## 🧰 Plugins

| Plugin | What it does |
|---|---|
| [`agento-patronum`](./plugins/agento-patronum/) | Blocks Claude's access to sensitive files & commands (`.env`, SSH keys, credentials, `printenv`) via a PreToolUse hook. |
| [`protego-totalum`](./plugins/protego-totalum/) | One command — `/protego-init` turns on Claude Code's native OS sandbox globally (network default-deny). Setup only. |
| [`revelio`](./plugins/revelio/) | Logs failed tool calls, API errors, and permission denials to a per-repo JSONL log you review with `/revelio`. |
| [`felix-felicis`](./plugins/felix-felicis/) | Everyday automation skills — awesome-list submissions, meeting invitations, repo setup, and more. |

Each plugin has its own README with full details. Together: **Patronum guards, Protego seals, Revelio reveals.**

## 🗂 Structure

```
hogwarts/
├── .claude-plugin/marketplace.json   # registers all plugins
├── .github/workflows/                # shared CI
└── plugins/<name>/                   # one self-contained plugin each
```

To add a plugin: drop it under `plugins/<name>/` with its own `.claude-plugin/plugin.json`, then add an entry to `marketplace.json`.

## 📜 License

[MIT](./LICENSE)

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm)*
