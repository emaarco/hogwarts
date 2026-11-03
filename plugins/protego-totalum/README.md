# 🛡️ Protego Totalum

> *Protego Totalum!* — the shield Hermione casts around the whole camp. Nothing gets in, nothing slips out.

This isn't a plugin. It's a script that raises two shields in your user-level Claude Code config and keeps them up to date:

- **The sandbox, set to strict.** Every shell command runs inside Claude Code's built-in OS sandbox. Writes stay in the working directory, and unknown hosts are refused.
- **The patronum hook.** A PreToolUse hook blocks `Read`, `Write`, `Edit`, `MultiEdit` and `Bash` calls that touch secrets (`.env`, private keys, SSH, AWS, Docker, kube, npm and PyPI credentials) or run `printenv`, sandbox or not.

## 🪄 Cast it

```bash
npx ./plugins/protego-totalum
```

Run it from a clone of this repo, and again whenever you pull. It needs Node 20+ and [`jq`](https://jqlang.github.io/jq/) for the hook. Try it on a scratch config first:

```bash
CLAUDE_CONFIG_DIR=/tmp/claude-test npx ./plugins/protego-totalum
```

## ⚙️ What a run does

| Where | What happens |
|---|---|
| `~/.claude/hooks/protego-totalum/` | Owned by the script: mirrored from [`hooks/`](./hooks), including deletes. Don't put your own files there. |
| `~/.claude/settings.json` | [`settings.json`](./settings.json) is merged in without touching your own settings. |
| `~/.claude/protego-totalum.lock.json` | Remembers what the last run wrote, so the next run knows what it owns. |

For each key in `settings.json`:

| Situation | Result |
|---|---|
| The key is missing | It is added. |
| The key still holds what the last run wrote | It is updated to the shipped value. |
| The key holds a value of your own | It stays as it is and is reported as `skipped`. |
| The key is no longer shipped and still holds what the last run wrote | It is removed. |

Lists such as `hooks.PreToolUse` or `permissions.deny` are merged item by item. Shipped items are appended, and only items an earlier run added are ever removed.

If `settings.json` is not valid JSON, the script stops before writing anything.

## 🏯 The strict shield

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

- `failIfUnavailable` — if the sandbox can't start, Claude Code refuses to run instead of running unsandboxed.
- `allowUnsandboxedCommands: false` — no unsandboxed retries. `/sandbox` shows this as **Strict sandbox mode**.
- `network.strictAllowlist` — hosts outside the allowlist are refused without asking.

Expect friction: every registry or API a repo needs has to be allowlisted first. Widen **that repo**, not the global default:

```jsonc
// ./.claude/settings.json
{ "sandbox": { "network": { "allowedDomains": ["registry.npmjs.org"] } } }
```

If build tools need to write their caches, add those paths to `sandbox.filesystem.allowWrite` (e.g. `~/.gradle`, `~/.m2`, `~/.npm`).

Hooks run outside the sandbox, so the patronum hook also guards the `Read`, `Write` and `Edit` tools, which the sandbox doesn't wrap.

- **macOS** — uses the built-in **Seatbelt** framework. Nothing to install.
- **Linux / WSL2** — needs `bubblewrap` and `socat`: `sudo apt-get install bubblewrap socat`.
- **Native Windows** — not supported. Use WSL2 instead.

Full spellbook: [Claude Code → Sandboxing](https://code.claude.com/docs/en/sandboxing) · [Hooks](https://code.claude.com/docs/en/hooks).

## 🧷 Your own protections

Shipped patterns live in [`hooks/patronum.json`](./hooks/patronum.json) and are overwritten on every run. Add your own as deny rules in `~/.claude/settings.json`, which the script never removes:

```json
{ "permissions": { "deny": ["Read(~/.config/gh/hosts.yml)"] } }
```

`Read` deny rules also feed into the sandbox, so they stop sandboxed shell commands too.

## 🔁 Migrating from agento-patronum

`agento-patronum` and its skills are gone. Clean up by hand:

- `/plugin uninstall agento-patronum@emaarco`, otherwise the hook runs twice.
- Delete `~/.claude/patronum.json`. Keep `~/.claude/patronum.log` if you still want the old entries; the hook keeps writing to it.

## 🤝 Related spells

- [`revelio`](../revelio) — shows what got blocked.
- [`imperio`](../imperio) — the same sync pattern, for code style rules.
