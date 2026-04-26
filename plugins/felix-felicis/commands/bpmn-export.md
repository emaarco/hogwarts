---
name: bpmn-export
description: "BPMN image export guidance — auto-activated when working with .bpmn files."
paths:
  - "**/*.bpmn"
---

# BPMN Image Export

To generate an image from a BPMN file, always use `bpmn-to-image` via npx:

```bash
npx bpmn-to-image <path-to-bpmn>:<path-to-output-image>
```

Example:

```bash
npx bpmn-to-image services/example-service/src/main/resources/bpmn/membership.bpmn:assets/membership.svg
```

- The output format is determined by the file extension (`.svg`, `.png`, `.pdf`).
- Always keep the output image next to or under the `assets/` directory of the relevant module.
