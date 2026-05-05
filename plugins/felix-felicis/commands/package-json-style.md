---
name: package-json-style
description: "package.json version pinning guidance — auto-activated when working with package.json files."
paths:
  - "**/package.json"
user-invocable: false
---

# package.json Style

## Dependency Versions

Always use exact (fixed) version strings. Never use version ranges.

**Bad:**
```json
"dependencies": {
  "express": "^4.18.2",
  "lodash": "~4.17.21",
  "react": ">=18.0.0",
  "axios": "*"
}
```

**Good:**
```json
"dependencies": {
  "express": "4.18.2",
  "lodash": "4.17.21",
  "react": "18.2.0",
  "axios": "1.6.7"
}
```

This applies to `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.

When adding or updating a dependency, always pin to the exact installed version. Use `npm install --save-exact` or `npm install --save-dev --save-exact`, or set `save-exact=true` in `.npmrc`.
