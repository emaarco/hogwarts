---
name: analyze
description: "End-to-end repo analysis: project overview, key files, maturity assessment with expert subagents per dimension, and real issues found."
allowed-tools: Agent, WebFetch, WebSearch, Bash, Read, Glob, Grep
---

# Skill: analyze

Performs a deep end-to-end analysis of the current repository and delivers a structured report across four sections.

## Phase 1 — Project Overview

Launch a single Explore subagent to sweep the repository. Instruct it to read the README, entry points, main modules, and core types, then report back on:

- What problem the project solves (2–3 sentences, plain language)
- Who uses it and how (consumers, dependents, runtime context)
- What the main packages / modules are and how they relate
- The primary data flow from entry point to output, step by step, with actual function and type names
- Core abstractions explained with simple analogies (not "this is a registry" but "this is like a phonebook that...")

## Phase 2 — Most Important Files

Based on the Phase 1 sweep, identify the 8–10 most important files. For each file:

- What it does (plain language — explain the logic, not just the name)
- Why it matters (what breaks or becomes impossible without it)

Then close with a short narrative — a compact story about how these files play together.

## Phase 3 — Maturity Assessment

Launch all six subagents **in parallel** (single message, multiple Agent tool calls). Each subagent adopts a specific expert persona, reads the relevant source files, searches the web for reference projects using the same stack or idea, and returns a structured assessment.

### Subagent 1 — Documentation
**Persona:** Junior engineer or newly-onboarded employee trying to get productive in the codebase for the first time.
**Assess:** README quality, inline comments, architecture docs, onboarding guides. Search for a well-documented reference project on the same stack. Rate 0–10: what exists, what's missing, highest-value next step.

### Subagent 2 — Dev Tooling
**Persona:** Senior DevOps or platform engineer who cares about developer ergonomics.
**Assess:** linting, formatting, git hooks, dependency management, local dev setup. Search for reference projects with strong tooling on this stack. Rate 0–10: what exists, what's missing, highest-value next step.

### Subagent 3 — Tests
**Persona:** QA lead responsible for shipping quality code with confidence.
**Assess:** test coverage, test types (unit / integration / e2e), risk areas with no coverage. Search for reference projects with mature test suites on this stack. Rate 0–10: what exists, what's missing, highest-value next step.

### Subagent 4 — Clean Code
**Persona:** Senior engineer conducting a thorough code review.
**Assess:** naming quality, separation of concerns within single files, file structure and separation of concerns across the project, duplication, type safety, known bugs or design smells. Search for reference projects considered clean or idiomatic on this stack. Rate 0–10: what exists, what's missing, highest-value next step.

### Subagent 5 — Agent-Skills
**Persona:** AI practitioner who builds and maintains Claude Code agent workflows.
**Assess:** how well the project is set up for AI-agent development — safeguards, `/skills`, hooks, rules, CLAUDE.md quality. Search `agentskills.io` for documentation on relevant skills; use the Claude Code docs as a fallback. Identify which skills or hooks would be most valuable to add. Rate 0–10: what exists, what's missing, highest-value next step.

### Subagent 6 — Pipelines
**Persona:** CI/CD specialist who has designed pipelines for production systems.
**Assess:** the full CI/CD build-up. Search for general best practices as well as practices specific to the detected technologies and frameworks. Identify what's mature, what's missing, structural improvements, and any current issues (e.g. slow jobs, missing cache, no deploy step). Search for reference projects with exemplary pipelines on this stack. Rate 0–10: what exists, what's missing, highest-value next step.

## Phase 4 — Issues Found

Read **all** source files. For each real issue (bug, design problem, type-safety gap, missing error handling, architectural inconsistency) report:

- File path + approximate line number
- Severity: `Critical` / `High` / `Medium` / `Low`
- What the problem is (specific)
- Why it matters
- Suggested fix

Skip purely stylistic issues unless they cause bugs. Sort by severity descending.

---

## Output Format

Deliver the final report as Markdown with these top-level sections:

```
## 1. Project Overview
## 2. Most Important Files
## 3. Maturity Assessment
## 4. Issues Found
```
