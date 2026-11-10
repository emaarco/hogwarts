# 🎩 Sorting Hat

> *The Sorting Hat* — looks inside every plugin and skill and decides where each file belongs. Whatever fits no house gets called out.

**Catch a broken plugin or skill before CI does.**

Not a plugin and not for installing: dev tooling for this repo that CI runs on every push.

## 🎩 The sorting

For every plugin registered in `.claude-plugin/marketplace.json`:

| Check | What it covers |
|---|---|
| `claude plugin validate` | The marketplace manifest, every `plugin.json`, and the skills, agents and commands of each plugin, as Claude Code itself checks them. |
| Skill rules | The house rules of this repo, stricter than the Agent Skills spec (see below). |

## 📜 Rules

- **skill-structure**: a skill holds `SKILL.md` and nothing but `scripts/`, `references/`, `assets/` and `evals/`.
- **skill-frontmatter**: `name` matches the folder, is lowercase-kebab and at most 64 characters; `description` is set and at most 1024 characters.
- **references-are-markdown**: `references/` holds only Markdown. Code goes to `scripts/`, templates and data to `assets/`.
- **max-line-count**: no text file in a skill exceeds 500 lines.

## ⚡ Run

```bash
cd tools/sorting-hat
npm ci
npm run validate
```

Needs Node 24+.

## 📜 License

[MIT](../../LICENSE)
