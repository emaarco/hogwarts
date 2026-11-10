# 🛡️ Protego Totalum

> *Protego Totalum!* — the shield Hermione casts around the whole camp. Nothing gets in, nothing slips out.

**Keep Claude Code away from your secrets, in every project on your machine.**

A script, not a plugin (plugins can't change user settings), that raises two shields in your user-level Claude Code config and keeps them up to date:

- **The sandbox, set to strict.** Every shell command runs inside Claude Code's built-in OS sandbox. Writes stay in the working directory, and unknown hosts are refused.
- **The patronum hook.** A PreToolUse hook blocks `Read`, `Write`, `Edit` and `MultiEdit` calls that touch secrets (`.env`, private keys, SSH, AWS, Docker, kube, npm and PyPI credentials, GitHub and GitLab CLI tokens, git and netrc logins, Claude Code's own login), and `Bash` commands starting with `printenv`, sandbox or not. `**/.env.*` also covers `.env.example`. Blocks are logged to `~/.claude/patronum.log` (or `$CLAUDE_CONFIG_DIR/patronum.log`).

## 🪄 Cast it

```bash
git clone https://github.com/emaarco/hogwarts.git
cd hogwarts
npx ./tools/protego-totalum
```

Restart Claude Code, then check: `/sandbox` shows **Strict sandbox mode**, and asking Claude to read a `.env` file gets blocked. Run it again whenever you pull. It needs Node 20+ and [`jq`](https://jqlang.github.io/jq/) for the hook; the script stops without jq, and a hook that finds no jq blocks every call. Try it on a scratch config first:

```bash
CLAUDE_CONFIG_DIR=/tmp/claude-test npx ./tools/protego-totalum
```

## ⚙️ What a run does

| Where | What happens |
|---|---|
| `~/.claude/hooks/protego-totalum/` | Owned by the script: mirrored from [`hooks/`](./hooks), including deletes. Don't put your own files there. |
| `~/.claude/settings.json` | [`settings.json`](./settings.json) is merged in; your values stay, but the file is re-formatted. |
| `~/.claude/protego-totalum.lock.json` | Remembers what the last run wrote, so the next run knows what it owns. |

For each key in `settings.json`:

| Situation | Result |
|---|---|
| The key is missing | It is added. |
| The key still holds what the last run wrote | It is updated to the shipped value. |
| The key holds a value of your own | It stays as it is and is reported as `skipped`. |
| The key is no longer shipped and still holds what the last run wrote | It is removed. |

Lists such as `hooks.PreToolUse` are merged item by item. Shipped items are appended, and only items an earlier run added are ever removed.

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

The sandbox only wraps shell commands; the patronum hook covers the `Read`, `Write` and `Edit` tools.

- **macOS** — uses the built-in **Seatbelt** framework. Nothing to install.
- **Linux / WSL2** — needs `bubblewrap` and `socat`: `sudo apt-get install bubblewrap socat`.
- **Native Windows** — not supported. Use WSL2 instead.

Full spellbook: [Claude Code → Sandboxing](https://code.claude.com/docs/en/sandboxing) · [Hooks](https://code.claude.com/docs/en/hooks).

## 🧷 Your own protections

Shipped patterns live in [`hooks/patronum.json`](./hooks/patronum.json) and are overwritten on every run. Add your own as deny rules in `~/.claude/settings.json`, which the script never removes:

```json
{ "permissions": { "deny": ["Read(~/.config/gcloud/**)"] } }
```

`Read` deny rules also feed into the sandbox, so they stop sandboxed shell commands too.

## 🔁 Coming from agento-patronum

The old plugin is gone and needs a manual clean-up: see [Migrating from agento-patronum](docs/migrating-from-agento-patronum.md).

## 🤝 Related spells

- [Revelio](../../plugins/revelio/) — shows what got blocked.
- [Imperio](../imperio/) — the same sync pattern, for code style rules.

## 🦉 Help and feedback

A crack in the shield? [Open an issue](https://github.com/emaarco/hogwarts/issues/new/choose). Contributing: [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📜 License

[MIT](../../LICENSE)
