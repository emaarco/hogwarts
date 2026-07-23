# Title conventions — Conventional Commits

Default when the repo defines nothing: `type(scope): subject`

## Types

| Type       | Use for                                   | SemVer |
| ---------- | ----------------------------------------- | ------ |
| `feat`     | a new feature                             | minor  |
| `fix`      | a bug fix                                 | patch  |
| `docs`     | documentation only                        | —      |
| `style`    | formatting, no code-behavior change       | —      |
| `refactor` | code change that neither fixes nor adds   | —      |
| `perf`     | performance improvement                   | patch  |
| `test`     | adding or fixing tests                    | —      |
| `build`    | build system or dependencies              | —      |
| `ci`       | CI configuration                          | —      |
| `chore`    | maintenance, no src/test change           | —      |
| `revert`   | reverts a previous commit                 | —      |

## Subject

- Imperative mood — "add", not "added" / "adds".
- Lower-case start, no trailing period.
- ≤ ~72 characters.

## Scope

- Optional. In monorepos it's usually the package/module that changed.
- Prefer repo-defined scopes when present; otherwise infer from the changed top-level package,
  or omit it entirely for repo-wide changes.

## Breaking changes

`type(scope)!: subject` (major bump) — and describe the break + migration in the body, or a
`BREAKING CHANGE:` footer.

## Where the repo may define its own rules

Check these before falling back to the defaults above:

- **commitlint** — `commitlint.config.{js,cjs,mjs,ts}`, `.commitlintrc*`, or
  `package.json#commitlint`: read `type-enum` and `scope-enum`.
- **release-please** — `release-please-config.json`: the package keys are the valid scopes.
- **PR-title lint** — `.github/workflows/*` running `amannn/action-semantic-pull-request`
  (`types:` / `scopes:` inputs).
- **CONTRIBUTING.md** — documented commit / PR conventions.
