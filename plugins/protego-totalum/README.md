# protego-totalum

> *Protego Totalum!* — one shield over everything.

One opinion, one command: **if you sandbox Claude Code, do it globally.**

`/protego-init` writes a strict, **network-default-deny** sandbox baseline into `~/.claude/settings.json`. From your next session on, every repo you open is isolated by Claude Code's **native OS sandbox** — filesystem confined to the worktree, network denied unless a project explicitly allows a host.

It's an **initializer, not a runtime plugin**: no per-call hook, no config file. It configures the OS sandbox and gets out of the way. That's the whole plugin — one command, one settings baseline.

> Guard specific secrets instead? → [`agento-patronum`](../agento-patronum). See what got blocked? → [`revelio`](../revelio). **Patronum guards, Protego seals, Revelio reveals.**

## ⚡ Install & run

```bash
/plugin marketplace add emaarco/hogwarts
/plugin install protego-totalum@emaarco
/protego-init
```

The sandbox applies on your **next** session. Requires [`jq`](https://jqlang.github.io/jq/) and native-sandbox support: **macOS** (Seatbelt), or Linux/WSL2 with `bubblewrap` + `socat`. `failIfUnavailable` is set — if the sandbox can't start, Claude Code refuses to run unsandboxed rather than leak.

## 🧩 What `/protego-init` merges

Deep-merged into `~/.claude/settings.json` (never clobbering your keys):

```json
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "network": { "allowedDomains": [], "strictAllowlist": true }
  },
  "permissions": { "deny": ["WebFetch", "WebSearch"] }
}
```

## 🔓 Widening one repo

Global is default-deny; widen where a project genuinely needs it — not the global default:

```jsonc
// ./.claude/settings.json
{ "sandbox": { "network": { "allowedDomains": ["registry.npmjs.org"] } } }
```

Ask Claude to make that edit; it applies on that repo's next session.

## 🤝 Contributing

[Open an issue](https://github.com/emaarco/hogwarts/issues/new) for ideas or bugs.

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm) · [LinkedIn](https://www.linkedin.com/in/schaeckm) · [Medium](https://medium.com/@emaarco)*
