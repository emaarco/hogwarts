#!/usr/bin/env node
// One-time setup check, bundled with the secure-publish-setup skill: every
// publishable package.json must carry a `repository.url` that matches the repo,
// plus a matching monorepo `directory`. npm's OIDC provenance publish verifies
// this against the signed attestation SERVER-SIDE and fails the real PUT with
// E422 when it is missing/mismatched — and `npm/pnpm publish --dry-run` cannot
// catch it, because that validation only happens on the actual publish (dry-run
// packs locally, never contacts the registry, and treats a missing `repository`
// as at most a warning). So this static check is the only way to catch it
// before release.
//
// This script stays in the skill and is run once, against the target repo, when
// the skill is applied — it is deliberately NOT copied into the repo (one home,
// no drifting copies). Accepted tradeoff: a later manual edit to package.json
// won't be re-checked.
//
// Generic: derives the expected repo from GITHUB_REPOSITORY (if set), else the
// git remote, else the root package.json `repository.url`; walks the workspace
// globs (or the root package when there are none); skips `private` packages.
//
// Run from the target repo root:
//   node "${CLAUDE_PLUGIN_ROOT}/skills/secure-publish-setup/scripts/check-publish-metadata.mjs"

import { readFileSync, globSync } from "node:fs"
import { execSync } from "node:child_process"

// Normalize any npm-accepted repository URL to `host/owner/repo`, matching how
// npm compares it against the provenance source repo.
const normalize = (url) =>
  url
    .trim()
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^(https?:\/\/|ssh:\/\/git@|git@)/, "")
    .replace(/:/, "/") // scp-style git@github.com:owner/repo
    .replace(/\.git$/, "")
    .replace(/\/+$/, "")

const root = JSON.parse(readFileSync("package.json", "utf8"))

const expectedRepo = (() => {
  if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY)
    return normalize(`${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`)
  try {
    return normalize(execSync("git config --get remote.origin.url", { encoding: "utf8" }))
  } catch {
    const rootUrl = typeof root.repository === "string" ? root.repository : root.repository?.url
    if (rootUrl) return normalize(rootUrl)
    console.error("Cannot determine the expected repository (no GITHUB_REPOSITORY, git remote, or root repository.url).")
    process.exit(1)
  }
})()

const globs = Array.isArray(root.workspaces) ? root.workspaces : (root.workspaces?.packages ?? [])
const manifests = globs.length
  ? [...new Set(globs.flatMap((g) => globSync(`${g}/package.json`)))]
  : ["package.json"]

const errors = []
for (const manifest of manifests) {
  const dir = manifest.replace(/\/?package\.json$/, "") || "."
  const pkg = JSON.parse(readFileSync(manifest, "utf8"))
  if (pkg.private === true) continue // not published

  const label = pkg.name ?? manifest
  const repo = pkg.repository
  const url = typeof repo === "string" ? repo : repo?.url

  if (!url) {
    errors.push(`${label}: missing "repository.url" (required for npm provenance).`)
  } else if (normalize(url) !== expectedRepo) {
    errors.push(`${label}: "repository.url" normalizes to "${normalize(url)}", expected "${expectedRepo}".`)
  }
  // In a workspace, each package needs a `directory` pointing at its subpath.
  if (dir !== "." && (typeof repo !== "object" || repo.directory !== dir)) {
    errors.push(`${label}: "repository.directory" is "${repo?.directory ?? "(missing)"}", expected "${dir}".`)
  }
}

if (errors.length > 0) {
  console.error("✗ Publish-metadata contract violated:\n")
  for (const error of errors) console.error("  - " + error)
  console.error("\nAdd/fix the `repository` field so `npm publish --provenance` succeeds (see the secure-publish-setup skill).")
  process.exit(1)
}

console.log(`✓ Publish-metadata contract OK for all published packages (repo: ${expectedRepo}).`)
