# agento-patronum

> *Expecto Patronum!* — block Claude's access to the files and commands it should never touch.

Claude Code will read your `.env`, SSH keys, or AWS credentials if it helps the task — or run `printenv` to dump your environment. agento-patronum blocks those, by file pattern and by command, through a **PreToolUse hook** Claude can't silently bypass: every matching `Read`/`Write`/`Edit`/`Bash` call is blocked and logged *before* it runs.

> Sandbox the whole session instead (no network, no cross-project leakage)? → [`protego-totalum`](../protego-totalum). See what got blocked? → [`revelio`](../revelio). **Patronum guards, Protego seals, Revelio reveals.**

## ⚡ Install

```bash
/plugin marketplace add emaarco/hogwarts
/plugin install agento-patronum@emaarco
```

Requires [`jq`](https://jqlang.github.io/jq/). Restart Claude Code once, then run `/patronum-list`.

## 🛡️ Default protections

| Category | Patterns |
|---|---|
| Env files | `**/.env`, `**/.env.*` |
| Private keys | `**/*.pem`, `**/*.key` |
| SSH · AWS | `~/.ssh/*` · `~/.aws/credentials`, `~/.aws/config` |
| Docker · Kubernetes | `~/.docker/config.json` · `~/.kube/config` |
| Package tokens | `~/.npmrc`, `~/.pypirc` |
| Commands | `printenv` |

## 🧰 Skills

| Skill | Does |
|---|---|
| `/patronum-add` · `/patronum-remove` | Add / remove a protected pattern |
| `/patronum-list` | Show all protected patterns |
| `/patronum-suggest` | Stack-specific suggestions |
| `/patronum-verify` | Self-test enforcement |

## ⚙️ How it works

`patronum-hook` matches every `Read`/`Write`/`Edit`/`MultiEdit`/`Bash` target against `~/.claude/patronum.json`. A match → blocked (exit 2) and logged to `~/.claude/patronum.log`. Fails **closed** on a corrupt config, **open** when it's absent. Pure bash + jq — no cloud, no binary, no Python.

## 🤝 Contributing

[Open an issue](https://github.com/emaarco/hogwarts/issues/new) for new patterns or bugs. Docs live under [`docs/`](./docs).

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm) · [LinkedIn](https://www.linkedin.com/in/schaeckm) · [Medium](https://medium.com/@emaarco)*
