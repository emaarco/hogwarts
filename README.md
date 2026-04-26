# hogwarts

> Claude Code plugins by emaarco — a single marketplace, multiple sub-plugins.

This repository is a Claude Code marketplace that bundles multiple plugins under one roof. Add the marketplace once, install the plugins you want.

## ⚡ Install

```bash
# Add marketplace once per machine
/plugin marketplace add emaarco/hogwarts

# Install the plugins you want
/plugin install agento-patronum@emaarco
/plugin install felix-felicis@emaarco
/plugin install revelio@emaarco
```

## 🧰 Plugins

| Plugin | What it does |
|---|---|
| [`agento-patronum`](./plugins/agento-patronum/) | Protects sensitive files, credentials, and commands from unintended AI access via PreToolUse hooks. |
| [`felix-felicis`](./plugins/felix-felicis/) | Everyday automation skills — submit repos to awesome lists, draft meeting invitations, and more. |
| [`revelio`](./plugins/revelio/) | Reveals failed tool calls, API errors, and permission denials by writing them to a per-repo JSONL log. |

Each plugin has its own `README.md` and `CLAUDE.md` with full details.

## 🗂 Structure

```
hogwarts/
├── .claude-plugin/marketplace.json   # Registers all plugins
├── .github/workflows/                # Shared CI for all plugins
└── plugins/
    ├── agento-patronum/
    ├── felix-felicis/
    └── revelio/
```

To add a new plugin: drop it under `plugins/<name>/` with its own `.claude-plugin/plugin.json`, then add an entry to the root `marketplace.json`.

## 📜 License

[MIT](./LICENSE)

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm)*
