---
name: typescript-style
description: "TypeScript code style guidance — auto-activated when working with .ts and .tsx files."
paths:
  - "**/*.ts"
  - "**/*.tsx"
user-invocable: false
---

# TypeScript Code Style

## Variable Naming

Use full, descriptive names for variables. Avoid abbreviated or cryptic shorthand.

**Bad:**
```typescript
const wsId = c.req.query("ws");
const cid = c.req.query("clientId") ?? "default";
const usr = await getUser(id);
const cfg = loadConfig();
```

**Good:**
```typescript
const websocketId = c.req.query("ws");
const clientId = c.req.query("clientId") ?? "default";
const user = await getUser(id);
const config = loadConfig();
```

This applies to all identifiers: local variables, function parameters, destructured bindings, and loop variables. Single-letter names are acceptable only for trivial loop counters (`i`, `j`) or conventional math variables.
