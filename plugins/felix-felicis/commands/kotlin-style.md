---
name: kotlin-style
description: "Kotlin code style guidance — auto-activated when working with .kt files."
paths:
  - "**/*.kt"
user-invocable: false
---

# Kotlin Code Style

- When a collection literal (`setOf`, `listOf`, `mapOf`, etc.) spans multiple lines, put each element on its own line.
- Prefer function-body style (`{ return ... }`) over expression-body style (`= ...`) for multi-line function implementations.
