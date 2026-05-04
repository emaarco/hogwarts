---
name: bpmn-export
description: "Export a BPMN file to an image (SVG, PNG, or PDF) using npx bpmn-to-image."
allowed-tools: Bash
---

# Skill: bpmn-export

Exports a BPMN file to an image using `npx bpmn-to-image`.

## Steps

### 1. Identify the source file

If the user has not provided a `.bpmn` file path, ask which file to export and what output format they want (`.svg`, `.png`, or `.pdf`).

### 2. Determine output path

Default: place the output image in the `assets/` directory of the relevant module, next to or below the BPMN file's module root. Ask if unsure.

### 3. Run the export

```bash
npx bpmn-to-image <path-to-bpmn>:<path-to-output-image>
```

Example:
```bash
npx bpmn-to-image services/example-service/src/main/resources/bpmn/membership.bpmn:assets/membership.svg
```

### 4. Confirm

Report the output path to the user and confirm the export succeeded.
