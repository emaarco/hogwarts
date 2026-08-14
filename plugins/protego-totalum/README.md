# protego-totalum

> *Protego Totalum!* — one shield over everything.

A **sandbox** is an OS-level box around the agent: filesystem confined to the worktree, network on a default-deny allowlist. It caps the blast radius — a wrong command or a prompt injection can't reach other projects, your home dir, or the open network to exfiltrate.

One opinion, one command: **if you sandbox Claude Code, do it globally.** `/protego-init` writes that baseline into `~/.claude/settings.json` via Claude Code's **native OS sandbox**; from your next session on, every repo you open is isolated. It's an **initializer, not a runtime plugin** — no per-call hook, no config file. It turns the sandbox on and gets out of the way.

Related shields — **Patronum guards, Protego seals, Revelio reveals:**
- [`agento-patronum`](../agento-patronum) — guard specific secrets (`.env`, keys, credentials)
- [`revelio`](../revelio) — see what got blocked

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
    "network": { "allowedDomains": ["github.com", "api.github.com", "raw.githubusercontent.com"], "strictAllowlist": true }
  },
  "permissions": { "deny": ["WebFetch", "WebSearch"] }
}
```

## 🔓 Widening one repo

The baseline only allows the GitHub ecosystem. Where a project needs more (a package registry, an internal host), widen *that* repo — not the global default:

```jsonc
// ./.claude/settings.json
{ "sandbox": { "network": { "allowedDomains": ["registry.npmjs.org"] } } }
```

Ask Claude to make that edit; it applies on that repo's next session.

## 🔬 How the sandbox works

This plugin doesn't build a sandbox — it turns on the one **Claude Code ships natively** and enforces at the OS level, so the agent can't opt out of it:

- **Filesystem** — the session is confined to the current worktree. On **macOS** this uses **Seatbelt** (`sandbox-exec`); on **Linux/WSL2**, **bubblewrap** namespaces. Reads/writes outside the worktree are denied by the kernel, not by a hook.
- **Network** — outbound traffic goes through a local proxy that only lets through hosts in `allowedDomains`. With `strictAllowlist: true` it's default-deny: anything not listed is refused (`socat` backs the proxy on Linux).
- **The settings keys**, all under `sandbox` in `~/.claude/settings.json`:
  - `enabled` — turn the native sandbox on.
  - `network.allowedDomains` / `strictAllowlist` — the default-deny host allowlist.
  - `failIfUnavailable` — if the OS sandbox can't start, refuse to run rather than fall back to unsandboxed.
  - `allowUnsandboxedCommands` — when `false`, no command may escape the sandbox.

Full reference: [Claude Code → Sandboxing](https://docs.claude.com/en/docs/claude-code/sandboxing) and [Settings](https://docs.claude.com/en/docs/claude-code/settings).

## 🤝 Contributing

[Open an issue](https://github.com/emaarco/hogwarts/issues/new) for ideas or bugs.

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm) · [LinkedIn](https://www.linkedin.com/in/schaeckm) · [Medium](https://medium.com/@emaarco)*
