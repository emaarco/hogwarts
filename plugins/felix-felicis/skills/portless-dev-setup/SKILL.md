---
name: portless-dev-setup
description: "Adopt portless for stable, git-worktree-aware .localhost dev URLs following its documented best practices (pinned devDependency + portless.json + dev/dev:app script split — never a hand-rolled slug or sh -c wrapper), then wire it into Conductor via .conductor/settings.toml. Detects the stack first, wraps ONLY the JS/TS frontend dev server, and researches per-workspace isolation for backends/DB/Docker that portless can't cover. Use when asked to set up portless, fix stable dev URLs across worktrees, or make a repo Conductor-friendly for parallel agents."
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: portless-dev-setup

Adopts [portless](https://portless.sh) for stable, git-worktree-aware `.localhost` dev URLs, following its **documented** best practices — not a hand-rolled approach — then wires it into [Conductor](https://conductor.build) so every workspace gets its own URL with no port threading. portless replaces a dev server's port with a stable URL and is git-worktree-aware: in a linked worktree it auto-derives `https://<worktree>.<project>.localhost`.

Run this when asked to "set up portless", get stable dev URLs that survive across git worktrees, refactor a brittle hand-rolled port/host wrapper, or make a repo safe for several Conductor agents running the frontend in parallel.

Work in **phases** and report findings before any large change. The scope boundary is the whole point: portless wraps **exactly one** thing — a JS/TS HTTP dev server. Everything else (backends, databases, Docker/compose, brokers, fixed non-HTTP ports) needs a *different* isolation strategy, covered in Phase 3.

## Ground rules

- **Verify against the live docs and the installed CLI — do not trust memory.** Run `portless --help` and `npm view portless version` before pinning anything, and `WebFetch` the portless / Conductor docs before recommending config.
- **Pin dependency versions exactly**, matching this repo's existing convention — check whether other deps use exact vs `^`/`~` and match it (this repo's `package-json-style` rule prefers exact).
- **Smallest change that follows the documented pattern.** Never build a branch/host slug yourself — portless derives it from the git worktree.
- **Use semantic commit messages. Do NOT commit unless explicitly asked** — stage edits, then show the diff and stop.

## Phase 0 — Detect the stack

Inspect and report before changing anything:

```bash
# Frontend dev server? (the ONLY thing portless should wrap)
cat package.json | jq '.scripts.dev, .scripts'
git ls-files | grep -E 'vite\.config|next\.config|svelte\.config|astro\.config|slides\.md|nuxt\.config'

# Other components that portless does NOT cover
git ls-files | grep -E '(docker-compose|compose)\.ya?ml$|Dockerfile|Makefile|Taskfile|pom\.xml|build\.gradle|go\.mod|requirements\.txt|pyproject\.toml'
cat package.json | jq '.workspaces'   # monorepo? if yes, repeat the script/config inspection for each workspace package.json — the frontend's dev script usually lives there, not at the root

# Is portless already wired in?
cat package.json | jq '.dependencies.portless, .devDependencies.portless, .portless, .scripts'
ls portless.json 2>/dev/null
```

Report: (a) the one JS/TS dev server, if any (Vite/Next/Slidev/Astro/SvelteKit/…); (b) other components — backend (Java/Go/Python/Node API), Docker/Podman/compose, databases, brokers, fixed ports, Make/Taskfile, monorepo workspaces; (c) current portless state — a `portless` dependency, a `portless.json`, a `package.json` `"portless"` key, or `portless` inside any npm script.

## Phase 1 — portless for the frontend (JS/TS dev server ONLY)

If portless is **not present**, add it. If portless **is present but hand-rolled** — a `sh -c` wrapper just to expand `$PORT`, a manually built branch/host slug, an assumed global install, or inline name guessing — refactor it to the documented shape.

**Target shape:**

1. Add `portless` as a **pinned devDependency** so `npm install` is enough — no global install. The proxy daemon is still a one-time per-machine step; document `npx portless service install` (needs `sudo` once).
2. Create **`portless.json`** with explicit config instead of inference:
   ```json
   { "name": "<project-name>", "script": "dev:app" }
   ```
3. **Split the npm scripts** so `dev` is only the portless entrypoint and the real command lives in `dev:app` (lets non-portless users run the server directly):
   ```json
   "dev": "portless",
   "dev:app": "<real dev command> --port $PORT"
   ```
   - `$PORT` is set by portless and expands natively in the `dev:app` shell — **no `sh -c`**.
   - Add only framework flags that are actually required, and **verify them for THIS framework**. Vite-based servers on macOS often need `--host` / `--bind 127.0.0.1` (because `localhost` resolves to IPv6 `::1`, which portless can't proxy) plus `'.localhost'` in Vite's `server.allowedHosts`.
4. **Remove** leftover manual slug/hostname construction and any `npm install -g portless` assumptions from scripts and docs.

Update README / CLAUDE.md / AGENT.md dev instructions to match: devDependency (not global), the one-time `npx portless service install`, the `<worktree>.<project>.localhost` URL shape, and that the slug is portless-derived (not hand-built).

## Phase 2 — Conductor scripts

Add or refresh **`.conductor/settings.toml`** (shared, committed) per the [Conductor scripts reference](https://conductor.build/docs/reference/scripts):

```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run = "npm run dev"
run_mode = "concurrent"
```

Substitute the package manager detected in Phase 0 (`pnpm install` / `pnpm dev`, `yarn` / `yarn dev`, `bun install` / `bun dev`) — the snippet shows npm only as the default.

- `run = "npm run dev"` gives each Conductor workspace its own `<workspace>.<project>.localhost` — **no `CONDUCTOR_PORT` threading needed for the frontend.**
- `concurrent` is safe **only** because each worktree gets a distinct portless subdomain. If the repo has a shared single-instance resource (one fixed port, one DB, one Docker stack) that can't be made per-workspace, use `run_mode = "nonconcurrent"`.
- The headless Run button has **no TTY for sudo**, so the proxy daemon must already be installed (`npx portless service install`). Note this in the docs.

## Phase 3 — Non-frontend components (IMPORTANT)

portless **only** helps a JS/TS HTTP dev server. It does **not** isolate backends, databases, Docker/compose stacks, brokers, or anything binding a fixed non-HTTP port. If Phase 0 found such components, **do not force portless onto them.** Instead:

1. Explicitly call out which parts portless does **not** cover.
2. Research current best practices for giving **those** parts the same per-workspace isolation philosophy — no cross-workspace collisions when several agents run in parallel. Evaluate and recommend what fits this repo:
   - parameterize service ports off Conductor's `CONDUCTOR_PORT`..`CONDUCTOR_PORT+9` range and thread them into the backend/compose env;
   - per-workspace Docker/compose namespacing (`COMPOSE_PROJECT_NAME` derived from `CONDUCTOR_WORKSPACE_NAME`) to avoid container/port/volume clashes;
   - per-workspace DB schemas/names or disposable ephemeral DBs;
   - `portless alias <name> <port>` to put a stable `.localhost` URL **in front of** a backend/Docker service that already exposes a port (the supported bridge);
   - when isolation is impossible: `run_mode = "nonconcurrent"` and/or Spotlight testing (run from repo root), and document the limitation.
3. **Verify against current docs before recommending** — Conductor [scripts](https://conductor.build/docs/reference/scripts), [environment variables](https://conductor.build/docs/reference/environment-variables), [Spotlight testing](https://conductor.build/docs/reference/scripts/spotlight-testing), and the relevant tool docs. Present options **with trade-offs** via `AskUserQuestion`; don't silently pick one for shared infra.

## Deliverables

1. **Short report** — detected stack, current portless state, what changed and why.
2. **The edits** — `portless.json`, `package.json` scripts + devDependency, lockfile, vite/build config (if needed), `.conductor/settings.toml`, doc updates.
3. **For non-FE parts** — a concrete, researched isolation recommendation with trade-offs.
4. **Verification, then stop:**
   ```bash
   node_modules/.bin/portless --version   # local binary resolves
   jq . portless.json                  # valid JSON
   # validate .conductor/settings.toml parses
   ```
   Then a self-terminating dev-server check — start it in the background, watch its output for the portless URL banner (`https://<worktree>.<project>.localhost` — that line appearing is the pass criterion), and always kill it afterwards:
   ```bash
   npm run dev > /tmp/portless-check.log 2>&1 &
   sleep 8; grep -m1 '\.localhost' /tmp/portless-check.log   # pass: prints the portless URL
   kill %1 2>/dev/null
   ```
   Show the diff — **do not commit.**

## Sources

- portless: https://portless.sh · https://github.com/vercel-labs/portless
- Conductor scripts: https://conductor.build/docs/reference/scripts
- Conductor environment variables: https://conductor.build/docs/reference/environment-variables
- Conductor Spotlight testing: https://conductor.build/docs/reference/scripts/spotlight-testing
