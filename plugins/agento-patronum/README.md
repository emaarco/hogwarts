# agento-patronum

> *Expecto Patronum!* — Summon your guardian for Claude Code sessions.
> Block access to sensitive files **and** seal the worktree so nothing leaves it.

**[Marketplace](https://github.com/emaarco/hogwarts)**

---

## 🛡️ What it protects you from

Claude Code is powerful. That power needs boundaries — especially when your
projects live side by side on one machine: customer A next to customer B next to
your own internal work.

agento-patronum draws two lines:

- **Static protection** — Claude will read your `.env`, your SSH keys, your AWS
  credentials if it helps. This blocks that, by file pattern and by command.
- **The seal** — stops data from *leaving* the current worktree: no outbound
  network, no reads or writes into a sibling project, no `WebFetch`/`WebSearch`.
  So a session working on customer A cannot exfiltrate to the internet or leak
  customer B's code into its context.

Both are enforced through **PreToolUse hooks** — the layer Claude Code can't
silently bypass — backed, for the seal, by Claude Code's **native OS sandbox**.

## 🧱 The two layers of the seal

| Layer | Mechanism | Guarantees |
|-------|-----------|------------|
| **1 — native sandbox** (primary) | Claude Code `sandbox.*` settings (macOS Seatbelt / Linux bubblewrap) | Filesystem writes confined to the worktree; network **default-deny**. OS-enforced. |
| **2 — egress hook** (fallback) | `patronum-seal-hook` PreToolUse | Blocks egress commands (`curl`, `wget`, `scp`, `ssh`, `npm publish`, `git push` to non-`origin`), reads/writes outside the worktree, and `WebFetch`/`WebSearch`. Works in-session, even where the native sandbox is unavailable. |

Run `/patronum-seal` to enable Layer 1. Layer 2 is active as soon as the plugin
is installed.

## ⚡ Install in two commands

```bash
# Add marketplace (once per machine)
/plugin marketplace add emaarco/hogwarts

# Install plugin (user scope — protects all projects)
/plugin install agento-patronum@emaarco
```

Restart Claude Code once. Run `/patronum-status` to see what's active, then
`/patronum-seal user` to seal every repo by default.

## 📋 Prerequisites

Requires **jq**. The native sandbox (Layer 1) needs Claude Code's sandbox support
(macOS, or Linux/WSL2 with `bubblewrap` + `socat`).

```bash
brew install jq         # macOS
apt install jq          # Debian/Ubuntu/WSL
yum install jq          # RHEL/CentOS
```

The setup script fails with a clear error if jq is missing. No other dependencies.

## 🧰 Available skills

Invoke them as slash commands in Claude Code:

| Skill | Description |
|-------|-------------|
| `/patronum-seal` | Enable the native OS sandbox — `user`, `project`, or `managed` tier |
| `/patronum-status` | Show every active protection layer for the current worktree |
| `/patronum-allow` | Widen the seal — allow one outbound domain or write path |
| `/patronum-add` | Add a sensitive-file/command pattern to the static protection list |
| `/patronum-remove` | Remove a pattern |
| `/patronum-list` | Show all protected patterns |
| `/patronum-suggest` | Get stack-specific protection suggestions |
| `/patronum-verify` | Self-test that enforcement is working |

## 🔒 Sealing every repo by default

The recommended setup — my sessions are sealed everywhere, opened up only where a
project needs it:

```
/patronum-seal user        # ~/.claude/settings.json — seals all repos by default
/patronum-allow --domain registry.npmjs.org   # per-project, when a repo needs it
/patronum-seal managed     # optional hard lock a user can't disable (prints sudo cmd)
```

Native-sandbox changes take effect on the **next** Claude Code session.

## 🛡️ Default protections (static)

| Category | Patterns |
|----------|----------|
| Environment files | `**/.env`, `**/.env.*` |
| Private keys | `**/*.pem`, `**/*.key` |
| SSH | `~/.ssh/*` |
| AWS | `~/.aws/credentials`, `~/.aws/config` |
| Docker | `~/.docker/config.json` |
| Kubernetes | `~/.kube/config` |
| Package tokens | `~/.npmrc`, `~/.pypirc` |
| Shell commands | `printenv` |

Default egress rules (seal): `curl`, `wget`, `nc`, `ncat`, `telnet`, `ssh`,
`scp`, `sftp`, `rsync`, `npm publish` — plus `git push` to any remote other than
`origin`. Manage both with `/patronum-add`, `/patronum-allow`, and `/patronum-suggest`.

## ⚙️ How it works

Two `PreToolUse` hooks run on every relevant tool call:

- `patronum-hook` — matches `Read`/`Write`/`Edit`/`MultiEdit`/`Bash` targets
  against patterns in `~/.claude/patronum.json`. Match → blocked and logged to
  `~/.claude/patronum.log`.
- `patronum-seal-hook` — enforces the egress/boundary rules in
  `~/.claude/patronum-seal.json`, logging to `~/.claude/patronum-seal.log`.

Both fail **closed** (block) on an unset `HOME` or corrupt config, and fail
**open** (allow) when their config is absent. No cloud, no binary, no Python —
pure bash + jq. The native sandbox is configured through standard Claude Code
`settings.json` and enforced by the OS.

## 📖 Story behind the plugin

Claude Code's `permissions.deny` rules in `settings.json` should keep sensitive
files out of reach — historically they were unreliable, so agento-patronum
enforces protection through PreToolUse hooks instead. The seal adds the other
half: strong, default-on isolation so a session physically cannot carry one
project's data out to the network or into another. Read more in
`docs/internals/why-hooks.md`.

## 🤝 Contributing

- **Suggest default patterns or egress rules**: [Open an issue](https://github.com/emaarco/hogwarts/issues/new)
- **Report bugs**: [Open a bug report](https://github.com/emaarco/hogwarts/issues/new)
- **Improve docs**: Edit any markdown file under `plugins/agento-patronum/docs/`

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm) · [LinkedIn](https://www.linkedin.com/in/schaeckm) · [Medium](https://medium.com/@emaarco)*
