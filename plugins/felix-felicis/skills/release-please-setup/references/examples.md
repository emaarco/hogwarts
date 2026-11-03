# Real-world reference implementations

Verified by reading each repo's actual `release-please-config.json` (not assumed from
docs). Use these when you want to show the user a working example instead of just the
templates in this folder.

## Form A — Single release

One version/tag for the whole repo, even if it internally contains multiple packages.

- [Miragon/bpmn-to-code](https://github.com/Miragon/bpmn-to-code/blob/main/release-please-config.json) — plain single-package repo (`release-type: simple`, Gradle project via `extra-files: gradle.properties`). The baseline case: no monorepo, no plugin, nothing to configure beyond the package itself.
- [emaarco/slidev-addon-dmn](https://github.com/emaarco/slidev-addon-dmn/blob/main/release-please-config.json) / [emaarco/slidev-addon-bpmn](https://github.com/emaarco/slidev-addon-bpmn/blob/main/release-please-config.json) — minimal single-package `node` configs, nothing but `package-name`.
- [Miragon/wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler/blob/main/release-please-config.json) — npm monorepo (`schema-model`, `dsl`, `transforms`, `renderer`, plus a VS Code extension and a web app) that still releases as **one** version. Every internal package's `version` field *and* every cross-package `dependencies` pin is listed under a single `"."` package's `extra-files`, so they all move in lockstep with one tag/changelog.
- [Miragon/mcp-toolkit](https://github.com/Miragon/mcp-toolkit/blob/main/release-please-config.json) — same lockstep pattern for an MCP SDK monorepo (`core`, `proxy-contract`, `tool-codegen`, `ui` + templates).

## Form B — Per-module, dependency-aware

Each module gets its own version/tag/changelog, but a module that depends on another
gets an automatic patch release (with its own changelog entry) whenever that
dependency releases — even if the dependent module's own code didn't change. This is
release-please's **workspace plugin** family, not just an `extra-files` version bump.
The plugin is what does this — the `release-please-config.json` itself never lists
"module X depends on module Y"; the plugin discovers that by reading each module's own
manifest at run time. See "How the dependency graph is actually discovered" in
`SKILL.md` Phase 3 for the exact mechanics and a worked example.

### Node — `node-workspace` (`config-per-module-dependency-aware.json`)

- [googleapis/gcloud-mcp](https://github.com/googleapis/gcloud-mcp/blob/main/release-please-config.json) — smallest real example to read end-to-end: 4 npm packages, `separate-pull-requests: true`, `plugins: [{ "type": "node-workspace", "updatePeerDependencies": true }]`. Caveat: as of this writing its 4 packages don't actually depend on each other yet, so the plugin is configured but dormant there — use it to read the *shape* of the config, not to see propagation happen.
- [eslint/rewrite](https://github.com/eslint/rewrite/blob/main/release-please-config.json) — ~10 npm packages, `node-workspace` plugin plus per-package `extra-files` (e.g. keeping a `jsr.json` version in sync). Shows the plugin composed with the same `extra-files` mechanic used in Forms A/C.
- [puppeteer/puppeteer](https://github.com/puppeteer/puppeteer/blob/main/release-please-config.json), [open-telemetry/opentelemetry-js-contrib](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/release-please-config.json), [grafana/plugin-tools](https://github.com/grafana/plugin-tools/blob/main/release-please-config.json) — larger, battle-tested `node-workspace` monorepos if the user wants to see it at real scale.

### Rust — `cargo-workspace` (`config-per-module-dependency-aware.rust.json`)

- [graphprotocol/indexer-rs](https://github.com/graphprotocol/indexer-rs/blob/main/release-please-config.json) — 3 crates (`config`, `service`, `tap-agent`), `plugins: ["cargo-workspace"]`. This one has a **live** dependency edge you can point to: `crates/service/Cargo.toml` and `crates/tap-agent/Cargo.toml` both declare `indexer-config = { path = "../config" }`, so a release of `config` auto-bumps both.

### Java/Maven — `maven-workspace` (`config-per-module-dependency-aware.maven.json`)

- [chingor13/release-please-playground](https://github.com/chingor13/release-please-playground/blob/main/release-please-config.json) — a release-please maintainer's own demo repo for this exact plugin: 3 Maven modules (`bom`, `multi1`, `multi2`), `plugins: [{ "type": "maven-workspace", "considerAllArtifacts": true }]`, one `component` per module.
- [genkit-ai/genkit-java](https://github.com/genkit-ai/genkit-java/blob/main/release-please-config.json) — real production repo, but uses `maven-workspace` with `updateAllPackages: true` under a single `"."` package to keep several `pom.xml` files in lockstep instead of giving each module its own tag — closer to Form A behavior with Maven's multi-pom mechanics; a useful contrast, not a Form B template to copy directly.

### Anything else

- **No workspace plugin exists for `release-type: simple`** (i.e. repos with no package manager release-please understands — Claude Code plugin marketplaces like this one included). For those, Form B isn't achievable automatically; fall back to Form A (roll cross-module changes into one release) or Form C (accept that a dependency's release won't auto-trigger its dependents).

## Form C — Per-module, self-contained

Each module gets its own version/tag/changelog, and modules don't depend on each
other, so there's nothing for a workspace plugin to do.

- [emaarco/hogwarts](https://github.com/emaarco/hogwarts/blob/main/release-please-config.json) — this repo. One release line (`component`, `include-component-in-tag: true`) per plugin under `plugins/*`, `separate-pull-requests: true`, each with its own `extra-files` to bump `.claude-plugin/plugin.json`. No plugin, because Claude Code plugins in this marketplace don't depend on one another.

## release-please core docs

- [Plugins section — manifest-releaser.md](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md#plugins) — canonical spec for `node-workspace`, `cargo-workspace`, `maven-workspace`, and `linked-versions` (which is a *different* mechanic: forcing a group of components to always share the same version number — not what Form B does). Also documents `always-link-local` (propagate across major bumps too, the default) and `updatePeerDependencies`/`considerAllArtifacts` (the ecosystem-specific knobs used in the Form B templates).
- [customizing.md](https://github.com/googleapis/release-please/blob/main/docs/customizing.md) — `release-type` values per ecosystem.
- [release-please-action](https://github.com/googleapis/release-please-action) — the GitHub Action wired up in Phase 3.
