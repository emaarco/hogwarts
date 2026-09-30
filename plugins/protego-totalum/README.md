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

## 🌍 Claude's recommendation: shield every castle

To sandbox every project instead of just one, the Claude Code docs recommend setting `sandbox.enabled` in your user settings at `~/.claude/settings.json`:

```json
{
  "sandbox": { "enabled": true }
}
```

This is the everyday shield. Writes stay inside the working directory, and the first time a command needs a new host, Claude Code asks you before letting it through. A command that fails in the sandbox may retry unsandboxed, but only through the normal permission prompt.

## 🏯 Protego Maxima: the very strict shield

If you want the shield locked tight, add the hardening keys the docs use for enforced org setups:

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

- `failIfUnavailable` — if the sandbox can't start, Claude Code refuses to run. Without it, Claude Code only warns and runs **unsandboxed**.
- `allowUnsandboxedCommands: false` — no unsandboxed retries, so every command has to run inside the shield. `/sandbox` shows this as **Strict sandbox mode**.
- `network.strictAllowlist` — hosts that aren't on the allowlist are refused without asking. This only works in user settings, managed settings or `--settings`, not in a repo's settings.

Expect more friction: every registry or API a repo needs has to be allowlisted first.

Want to try the strict shield before you commit? Start one sealed session:

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
