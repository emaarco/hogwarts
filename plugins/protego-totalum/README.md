# 🛡️ Protego Totalum — sealing Claude Code with `/sandbox`

> *Protego Totalum!* — the shield Hermione casts around the whole camp. Nothing gets in, nothing slips out.

This isn't a plugin. You don't need one: Claude Code already knows the spell. It's called **`/sandbox`**, and this page is our recommendation for how to cast it.

## 🏰 Why raise the shield

A sandbox is an OS-level box around every shell command Claude runs:

- **Filesystem** — writes are confined to your working directory (plus a temp dir and any `--add-dir` paths). Other projects and your home dir stay out of reach.
- **Network** — outbound traffic goes through a local proxy that only lets allowed hosts through.

It caps the blast radius. A wrong command or a prompt injection can't wander into other repos or send your secrets off to some unknown host. And since the kernel enforces it, not a hook, Claude can't argue its way out.

## 🪄 Cast it

In any Claude Code session:

```text
/sandbox
```

This opens the sandbox panel:

- **Mode** — *auto-allow* (sandboxed commands run without prompting) or *regular permissions* (you still approve every command).
- **Overrides** — whether a command that fails inside the sandbox may fall back to running unsandboxed (`allowUnsandboxedCommands`).
- **Config** — the settings that are actually in effect.
- **Dependencies** — shown on Linux/WSL2 when something's missing.

The panel saves to `.claude/settings.local.json`, so the shield only covers **that one project**.

## 🌍 Our recommendation: shield every castle

If you sandbox, do it **globally**. Put the baseline in `~/.claude/settings.json` so every repo you open is sealed from day one:

```json
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "network": { "strictAllowlist": true }
  }
}
```

- `enabled` — raise the shield everywhere.
- `failIfUnavailable` — if the sandbox can't start, refuse to run. The default only warns and then runs **unsandboxed**.
- `allowUnsandboxedCommands: false` — nothing gets to slip past the shield.
- `network.strictAllowlist` — default-deny: a host that isn't listed gets refused.

Want to try it before you commit? Start one sealed session:

```bash
claude --settings '{"sandbox": {"enabled": true, "allowUnsandboxedCommands": false}}'
```

## 🔓 Letting a trusted owl through

Some repos need a package registry or an internal host. Widen **that repo**, not the global default:

```jsonc
// ./.claude/settings.json
{ "sandbox": { "network": { "allowedDomains": ["registry.npmjs.org"] } } }
```

If build tools need to write their caches, add those paths to `sandbox.filesystem.allowWrite` (e.g. `~/.gradle`, `~/.m2`, `~/.npm`).

## 🔬 How the magic works

- **macOS** — uses the built-in **Seatbelt** framework. Nothing to install.
- **Linux / WSL2** — needs `bubblewrap` (filesystem isolation) and `socat` (network proxy relay): `sudo apt-get install bubblewrap socat`. On Ubuntu 24.04+ you may also need an AppArmor profile for `bwrap`.
- **Native Windows** — not supported. Use WSL2 instead.

Full spellbook: [Claude Code → Sandboxing](https://code.claude.com/docs/en/sandboxing) · [Settings reference](https://code.claude.com/docs/en/settings-reference).

## 🤝 Related spells

**Patronum guards, Protego seals, Revelio reveals.**

- [`agento-patronum`](../agento-patronum) — guards specific secrets (`.env`, keys, credentials), sandbox or not.
- [`revelio`](../revelio) — shows what got blocked.
