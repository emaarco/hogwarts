# Imperio

> *Imperio* — the Imperius Curse. Puts your rules into the agent's head. Like Harry, it can still fight back.

Claude Code plugin that puts path-scoped rules into Claude's context through a hook. When Claude reads or changes a file, the rules for that file type arrive before the change is written.

> **Beta.** New and not yet battle-tested on real repos. Expect rough edges and expect the shape to move.

## 🪄 The spell

A rule packaged as a skill only helps when Claude decides to load it, and for a small edit it often doesn't. **Imperio** doesn't leave that to Claude. A `PreToolUse` hook checks every `Read`, `Edit`, `Write`, and `MultiEdit` against the `paths` of each rule and injects the matching ones.

| Claude calls | Rule not injected yet | Rule already injected |
|---|---|---|
| `Read` | The file is read, and the rule is added to the context next to it. | Nothing happens. |
| `Edit`, `Write`, `MultiEdit` | The call is denied once, with the rule as the reason. Claude repeats it with the rule in context. | The call runs. |

Each rule is injected once per session, and once more for every subagent, since a subagent has its own context. After `/clear` or a compaction the rules are injected again.

## 📜 Rules

- **[kotlin-style](./rules/kotlin-style.md)** (`**/*.kt`): One element per line in multi-line collection literals; function bodies instead of expression bodies; named arguments for calls with two or more arguments.
- **[typescript-style](./rules/typescript-style.md)** (`**/*.ts`, `**/*.tsx`): Descriptive variable names, no abbreviations.
- **[package-json-style](./rules/package-json-style.md)** (`**/package.json`): Exact dependency versions, no `^`, `~`, or other ranges.

## ⚡ Install

```
/plugin marketplace add emaarco/hogwarts
/plugin install imperio@emaarco
```

Needs Node 20.17+ or 22.5+ on your `PATH`.

## 🚫 Non-goals

- **No enforcement.** The curse can be resisted. Imperio makes sure Claude has seen the rule. It does not check that the written code follows it. Use a linter for that.
- **No project-specific rules.** The plugin ships its own rules. Rules that belong to one repo go into that repo's `.claude/rules/`.

## License

MIT
