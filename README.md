# hogwarts

> Claude Code plugins by emaarco — a single marketplace, multiple sub-plugins.

This repository is a Claude Code marketplace that bundles multiple plugins under one roof. Add the marketplace once, install the plugins you want.

## ⚡ Install

```bash
# Add marketplace once per machine
/plugin marketplace add emaarco/hogwarts

# Install the plugins you want
/plugin install agento-patronum@emaarco
/plugin install revelio@emaarco
```

## 🧰 Plugins

| Plugin | What it does |
|---|---|
| [`agento-patronum`](./plugins/agento-patronum/) | Protects sensitive files, credentials, and commands from unintended AI access via PreToolUse hooks. |
| [`revelio`](./plugins/revelio/) | Reveals failed tool calls, API errors, and permission denials by writing them to a per-repo JSONL log. |

Each plugin has its own `README.md` and `CLAUDE.md` with full details.

## 🗂 Structure

```
hogwarts/
├── .claude-plugin/marketplace.json   # Registers all plugins
├── .github/workflows/                # Shared CI for all plugins
└── plugins/
    ├── agento-patronum/
    └── revelio/
```

To add a new plugin: drop it under `plugins/<name>/` with its own `.claude-plugin/plugin.json`, then add an entry to the root `marketplace.json`.

## 📜 License

[MIT](./LICENSE)

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm)*
