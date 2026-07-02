---
name: patronum-suggest
description: "Suggest protection patterns based on project context. Invoke automatically when user mentions a new tech stack, cloud provider, or sensitive tooling. Also invoke when user asks what to protect."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"), Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-add.sh" *), Glob, Read, AskUserQuestion, WebSearch
---

# Skill: patronum-suggest

Analyze the current project and suggest relevant protection patterns.

## Steps

### 1. Detect tech stack

Check what tools and cloud services are in use. Look at:
- `package.json`, `go.mod`, `requirements.txt`, `Gemfile`, `Cargo.toml`
- `.tf` files (Terraform), `docker-compose.yml`, `Dockerfile`
- `.gcloud/`, `.azure/`, cloud config directories
- CI/CD files (`.github/workflows/`, `.gitlab-ci.yml`)

### 2. Research sensitive files

Use `WebSearch` to find known sensitive files, credential paths, and secret locations for the detected technologies. Search for patterns like:
- "[technology] sensitive files credentials path"
- "[cloud provider] local config files secrets"

This ensures suggestions cover technology-specific risks beyond the hardcoded list.

### 3. Check current protections

Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"` to see what is already protected.

### 4. Build suggestions

Based on detected stack and web research, suggest patterns that are NOT yet protected. Common suggestions include:
- **Terraform**: `**/*.tfvars`, `**/*.tfstate`, `**/.terraform/environment`
- **GCP**: `~/.config/gcloud/credentials.db`, `**/service-account*.json`
- **Azure**: `~/.azure/accessTokens.json`, `~/.azure/msal_token_cache.json`
- **Ruby**: `~/.gem/credentials`
- **Gradle/Maven**: `~/.gradle/gradle.properties`, `~/.m2/settings.xml`
- **Kubernetes**: `**/kubeconfig`, `**/*.kubeconfig`
- **Vault**: `~/.vault-token`
- **GPG**: `~/.gnupg/*`

Also suggest **command patterns** where the stack warrants it, using the `Bash(<command>)` prefix-match format (see `docs/rules/bash-commands.md`), e.g. `Bash(aws sts)`, `Bash(gcloud auth print-access-token)`, `Bash(printenv)`.

This catalogue can go stale — verify each path against the web research from Step 2 before suggesting it (e.g. Azure's `accessTokens.json` only exists on older CLI versions; modern ones use the MSAL token cache).

Include any additional patterns discovered via web search.

### 5. Confirm with user

Use `AskUserQuestion` to present the suggestions as a formatted list with reasons.
Let the user select which patterns to add.

### 6. Add confirmed patterns

For each confirmed pattern, run:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-add.sh" "<pattern>" --reason "<reason>"
```

Present the final updated protection list as a markdown table.
