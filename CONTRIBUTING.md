# 🧹 Contributing

> _Every spell here started as a chore someone hit twice._

Bug reports, feature ideas and refactor proposals go to [issues](https://github.com/emaarco/hogwarts/issues/new/choose).

## 🗺️ Repository layout

```
hogwarts/
├── .claude-plugin/marketplace.json   # registers all plugins
├── .github/workflows/                # shared CI
├── plugins/<name>/                   # one self-contained Claude Code plugin each
└── tools/<name>/                     # one self-contained npm package each (config sync or repo dev tooling), not in the marketplace
```

Each plugin and tool has its own `CLAUDE.md` with its architecture and conventions.

## 🪄 Adding a plugin

1. Create `plugins/<name>/` with its own `.claude-plugin/plugin.json`.
2. Add an entry to `.claude-plugin/marketplace.json`.
3. Add a job for it to `.github/workflows/validate-plugins.yml`.

## 🛠 Adding a tool

1. Create `tools/<name>/` with a `package.json` (`bin`, `files`, `scripts.test`) and a `CLAUDE.md`.
2. Add a job that runs `npm test` in it to `.github/workflows/validate-plugins.yml`.
3. List it in the root `README.md`.

## 🎩 Validation

The [Sorting Hat](tools/sorting-hat/) runs `claude plugin validate` on every plugin and checks each skill against this repo's house rules. CI runs it on every push; run it locally with Node 24 or later:

```bash
cd tools/sorting-hat
npm ci
npm run validate
```
