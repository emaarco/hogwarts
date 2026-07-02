---
name: bpmn-export
description: "Export a BPMN file to an image (SVG, PNG, or PDF) using npx bpmn-to-image. Use when asked to export, render, or convert a .bpmn diagram to an image."
allowed-tools: Bash, AskUserQuestion
---

# Skill: bpmn-export

Exports a BPMN file to an image using `npx bpmn-to-image`.

## Steps

### 1. Identify the source file

If the user has not provided a `.bpmn` file path, ask which file to export and what output format they want (`.svg`, `.png`, or `.pdf`).

### 2. Determine output path

Default: `<module-root>/assets/<basename>.<ext>`, where the module root is the nearest ancestor directory of the BPMN file containing a build manifest (`package.json`, `pom.xml`, `build.gradle`, …). If the repo has no module structure, use `assets/` at the repo root. Ask if unsure.

### 3. Run the export

Use `--yes` so npx installs the package without prompting (a plain `npx` call hangs on the install confirmation in non-interactive runs):

```bash
npx --yes bpmn-to-image <path-to-bpmn>:<path-to-output-image>
```

Example:
```bash
npx --yes bpmn-to-image services/example-service/src/main/resources/bpmn/membership.bpmn:services/example-service/assets/membership.svg
```

### 4. Confirm

Report the output path to the user and confirm the export succeeded.
