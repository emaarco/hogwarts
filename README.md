# hogwarts

> A Hogwarts for Claude Code — a spellbook of plugins that guard, reveal & automate. 🏰🪄

**hogwarts** is a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace. Instead of one big config, it bundles several small, focused plugins — each named after a spell or potion — that harden, observe, and automate your everyday agent workflows.

Add the marketplace once, then install only the spells you need.

## ⚡ Install

```bash
/plugin marketplace add emaarco/hogwarts     # once per machine
/plugin install <plugin>@emaarco             # e.g. revelio@emaarco
```

## 🧰 Plugins

| Plugin | What it does |
|---|---|
| [`revelio`](./plugins/revelio/) | Lists and groups failed tool calls, rejections, and API errors from Claude Code's session transcripts with `/revelio` and `/revelio-patterns`. |
| [`felix-felicis`](./plugins/felix-felicis/) | Everyday automation skills — awesome-list submissions, repo setup, and more. |

Each plugin has its own README with full details.

## 🛠 Tools

Not plugins: small scripts that sync config into your user-level `~/.claude`, plus dev tooling for this repo.

- [Protego Totalum](./tools/protego-totalum/) — puts Claude Code into the strict sandbox and installs a hook that blocks access to secrets (`.env`, SSH keys, credentials, `printenv`), without touching your own settings.
- [Imperio](./tools/imperio/) — keeps path-scoped code style rules (Kotlin, TypeScript, `package.json`) up to date in `~/.claude/rules/`.
- [Sorting Hat](./tools/sorting-hat/) — repo dev tooling, not for installing: runs `claude plugin validate` on every plugin and sorts their skills against stricter house rules (layout, frontmatter, line limits) in CI.

Together: **Protego guards and seals, Revelio reveals.**

## 🗂 Structure

```
hogwarts/
├── .claude-plugin/marketplace.json   # registers all plugins
├── .github/workflows/                # shared CI
├── plugins/<name>/                   # one self-contained Claude Code plugin each
└── tools/<name>/                     # one self-contained npm script each (config sync or repo dev tooling), not in the marketplace
```

To add a plugin: drop it under `plugins/<name>/` with its own `.claude-plugin/plugin.json`, then add an entry to `marketplace.json`.

## 📜 License

[MIT](./LICENSE)

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm)*
