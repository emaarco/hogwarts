# Changelog

## [2.0.1](https://github.com/emaarco/hogwarts/compare/revelio-v2.0.0...revelio-v2.0.1) (2026-11-12)


### Bug Fixes

* **revelio:** read transcripts from CLAUDE_CONFIG_DIR and include subagent transcripts ([#160](https://github.com/emaarco/hogwarts/issues/160)) ([24dbe0a](https://github.com/emaarco/hogwarts/commit/24dbe0a6ce37eb93d7ba335054fc1553a4d0a88c))

## [2.0.0](https://github.com/emaarco/hogwarts/compare/revelio-v1.0.0...revelio-v2.0.0) (2026-11-03)


### ⚠ BREAKING CHANGES

* **protego-totalum:** merge agento-patronum into a script that syncs hooks and strict sandbox settings into ~/.claude ([#154](https://github.com/emaarco/hogwarts/issues/154))

### Features

* **protego-totalum:** merge agento-patronum into a script that syncs hooks and strict sandbox settings into ~/.claude ([#154](https://github.com/emaarco/hogwarts/issues/154)) ([9ec0569](https://github.com/emaarco/hogwarts/commit/9ec05692d5fc8e124c37db576d1b4aef321b05de))

## [1.0.0](https://github.com/emaarco/hogwarts/compare/revelio-v0.2.1...revelio-v1.0.0) (2026-10-29)


### ⚠ BREAKING CHANGES

* **revelio:** the hooks and /revelio-clear are removed; .claude/logs/revelio.jsonl is no longer written.

### Features

* **revelio:** replace the logging hooks with skills that read the agent's transcripts ([#149](https://github.com/emaarco/hogwarts/issues/149)) ([e9d348a](https://github.com/emaarco/hogwarts/commit/e9d348a6768bd69ec62c1fb71a4cd0c18cd9f3c2)), closes [#148](https://github.com/emaarco/hogwarts/issues/148)

## [0.2.1](https://github.com/emaarco/hogwarts/compare/revelio-v0.2.0...revelio-v0.2.1) (2026-07-02)


### Bug Fixes

* resolve skill audit findings in agento-patronum and revelio ([#28](https://github.com/emaarco/hogwarts/issues/28)) ([4ee4fe7](https://github.com/emaarco/hogwarts/commit/4ee4fe716dfeb610453d107666b9f9d29934f0cc))

## 0.2.0 (2026-06-24)


### Features

* **revelio:** auto-add .claude/logs/ to .gitignore on session start ([#2](https://github.com/emaarco/hogwarts/issues/2)) ([f01b3de](https://github.com/emaarco/hogwarts/commit/f01b3def28eae4d4bf8aa21fbf59723f3a087353))

## 0.1.0 (2026-04-25)


### Features

* **revelio:** reveal failures by logging failed tool calls, API errors, and permission denials to .claude/logs/revelio.jsonl ([#1](https://github.com/emaarco/hogwarts/issues/1)) ([dd64ea7](https://github.com/emaarco/hogwarts/commit/dd64ea757adf621413ee1f287348df694d7f0bf4))
