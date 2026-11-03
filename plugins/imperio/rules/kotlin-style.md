---
paths:
  - "**/*.kt"
---

# Kotlin Code Style

- When a collection literal (`setOf`, `listOf`, `mapOf`, etc.) spans multiple lines, put each element on its own line.
- Always use function-body style (`{ return ... }`) instead of expression-body style (`= ...`).
- When a function or constructor call passes two or more arguments, use named arguments (`createUser(name = "Harry", house = "Gryffindor")`).
