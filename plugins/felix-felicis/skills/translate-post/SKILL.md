---
name: translate-post
description: "Translate a blog post or article into a target language so it reads as if it were written in that language, not translated into it — translate (keeping technical terms in the form native speakers actually use), then loop a fresh, isolated native-speaker reviewer over the text until no source-language interference, calques, or unnatural phrasing remain. Also works on a file already in the target language to only run the nativeness loop. You tell it the source file and the target language — there is no fixed repo structure. Use when asked to translate a post, translate an article to a language, make a translation sound native, or check text for anglicisms / translationese."
allowed-tools: Agent, Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

# Skill: translate-post

Produce a version of a post that reads as if it were *written* in the target language, not translated into it. Works for any source and target language — you supply both. The skill has two phases: an initial translation (skipped when the input is already in the target language) and a review–fix loop in which a fresh native-speaker reader agent reads the text sentence by sentence and flags everything that is not natural in the target language.

## IMPORTANT

- **You provide the input and the languages — there is no assumed structure.** The source file and the target language come from `$ARGUMENTS` or from asking the user. Never guess a project layout or filename convention; ask when unsure (Step 1).
- **Loop until a fresh reviewer is satisfied.** Translate → native-reader review → fix → review again. Stop only when a full round returns no actionable finding, the user says it is good enough, or the 5-round safety cap hits. Never stop after one round on your own.
- **The reviewer runs isolated — every round.** Each round spawns a *new* Agent that gets only the current target-language text, the target language, and its persona brief. Never pass it earlier findings, the fix log, or the fact that this is a re-review. The value of the loop is an unbiased fresh read; priming the reviewer destroys it.
- **Technical terms stay in the form native speakers use.** Apply the whiteboard test (Step 3). Never localize code, product names, or established pattern names — but do not leave a term in the source language when the target language has a word people actually use.
- **Meaning must not drift.** Nativizing rewrites sentences freely, but the technical claims must stay exactly those of the source. Step 5 verifies this explicitly.
- **Back up before editing an existing file.** Any file that already exists and will be edited gets snapshotted before the first Edit.
- **Honor extra constraints from `$ARGUMENTS`** (e.g. "no em-dashes", "formal register / Sie-Form", "keep under 1200 words") as hard rules for the translation, every reviewer, and every fix.

## Step 1: Parse arguments and decide the mode

From `$ARGUMENTS`, extract three things:

1. **The input file** — a path to the text to work on. If none is given, and the current directory clearly has one obvious candidate (e.g. a single `*.md` article in scope), you may propose it; otherwise ask.
2. **The target language** — the language the output should be in (e.g. "German", "Spanish", "French"). Look for phrasings like "to German", "into Spanish", "make the French sound native", "check this for anglicisms" (implies the file's own language).
3. **Extra constraints** — any remaining instructions (register, punctuation, length, terminology rules). Treat these as hard rules (see IMPORTANT).

Determine the **source language** by reading the input file (detect it from the content; do not rely on the filename).

Decide the mode:

- **translate** — the target language differs from the input file's language → translate the source into the target language.
- **nativize-only** — the input file is already in the target language (either detected as such, or the user said "make this sound native / check for anglicisms / fix the <lang>") → skip translation and run only the native-reader loop. If a second file in the source language is given, it becomes the faithfulness source for Step 5.

If the target language is missing or ambiguous, or you cannot confidently tell which mode applies, use AskUserQuestion:
- question: "What should I do with this file?"
- header: "Task"
- options: e.g. "Translate it to <lang>" / "It's already in <lang> — only run the native-reader loop" / "Something else (let me clarify)"

If no input file can be found or confirmed, stop and report it plainly — never invent content.

## Step 2: Output path and backup

**Mode translate:** pick an output path. Default to inserting a short language tag before the extension of the source path (e.g. `post.md` → `post.de.md`, or `article.en.md` → `article.es.md`), unless `$ARGUMENTS` gives an explicit output path or the repo has an obvious convention you can see. Confirm the chosen path with the user if there is any doubt. If the output file already exists, ask via AskUserQuestion whether to overwrite it or switch to nativize-only on the existing file ("Overwrite with a fresh translation" / "Keep it and only run the native-reader loop" / "Cancel").

**Whenever a file that already exists will be edited**, snapshot it first:

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
if [ -d .context ]; then BACKUP_DIR=".context/translate-post"; else BACKUP_DIR="$(mktemp -d)/translate-post"; fi
mkdir -p "$BACKUP_DIR"
cp "<target-path>" "$BACKUP_DIR/$(basename "<target-path>").backup-$STAMP"
echo "$BACKUP_DIR/$(basename "<target-path>").backup-$STAMP"
```

Report the backup path. Capture the starting word count (`wc -w`) for the final summary.

## Step 3: Translate (skip in nativize-only mode)

Read the source in full and translate it into the target language. Two rule sets apply: what to preserve, and how to write the target language.

### Preserve unchanged

- Fenced code blocks and inline code — verbatim, not a single character altered
- URLs — as-is; translate only natural-language link labels
- Product, framework, and tool names (e.g. Spring Boot, Kotlin, GitHub, Postgres, …)
- Established pattern names and acronyms (e.g. "Outbox Pattern", "Dead Letter Queue", API, CI/CD, JVM, …)
- Markdown structure, section emojis, and YAML frontmatter keys — translate only human-readable frontmatter values (`title`, `description`); keep `status`, `tags`, dates untouched

### The whiteboard test for terminology

Keep a term in its original form (usually English) if a native speaker of the target language, in this field, would say the original word out loud at a whiteboard (in software: *Deployment, Pull Request, Branch, Commit, Bug, Feature, Repository, Pipeline, Refactoring, Trade-off* — the exact set depends on the target language). Translate it when there is a target-language word people actually use for the concept (e.g. *reliability, maintainability, behavior, approach* usually have natural equivalents).

Loanwords kept in the target language take that language's grammar — articles, gender, capitalization, inflection — and read naturally in it. When unsure, keep the original term: a forced, over-localized coinage usually reads worse than the borrowed word native speakers actually use.

### Write the target language, don't transcode the source

- Restructure sentences to the target language's grammar and natural word order. Never mirror the source's syntax or participial openers ("Having done X, …").
- Replace source-language idioms and imagery with target-language equivalents — never translate them literally.
- Complete elliptical source constructions that the target language cannot leave open; make every sentence logically complete in the target language.
- Use the connectives and discourse markers the target language's prose actually runs on, instead of chaining the source's "and"/"but" rhythm.
- Match the source author's voice and tone. If the repo has a style/voice guide or a mechanics guide in scope (or the user points at one), honor it for the target text too; otherwise stay faithful to the source's own register and rhythm.
- Address the reader with the register the source uses (formal vs. informal), unless `$ARGUMENTS` says otherwise.

Write the result to the output path.

## Step 4: The isolated native-reader loop

Track a round counter starting at 1.

### Step 4a: Run one isolated review

Launch **one fresh Agent per round**. Its prompt contains exactly: the persona brief below (with the target language filled in), the absolute path of the target-language file, the target language, any extra constraints from Step 1, and the output format. Nothing else — no history, no round number, no prior findings (see IMPORTANT).

**Persona brief — the native-speaker reader:**

> You are a native speaker of **<TARGET_LANGUAGE>** and a software developer, reading this blog post as a real reader. Read the full text **sentence by sentence**. For every single sentence ask yourself:
>
> 1. Would a native speaker actually phrase it this way — or is this translated source-language showing through? (translation clichés, mirrored source-language syntax, idioms carried over literally)
> 2. Is the sentence logically complete in <TARGET_LANGUAGE>? Elliptical constructions that work in the source language are often broken in the target language — what is the sentence actually saying?
> 3. Are grammar and mechanics correct for <TARGET_LANGUAGE>: agreement, case/gender, articles (including the right article/gender for borrowed technical terms), punctuation, word order, and the referents of pronouns like "this / that / it"?
> 4. Is the terminology choice right? A term that is over-localized into <TARGET_LANGUAGE> when native developers actually say the original word is just as wrong as needless borrowing where a natural <TARGET_LANGUAGE> word exists.
> 5. Do rhythm and tone read like a real <TARGET_LANGUAGE> blog post — colloquialisms and turns of phrase where a native author of the language would use them?
>
> Do not judge the technical content, structure, or length — only the language. Do not rewrite the whole post. Return a structured list of findings, one per issue:
>
> - **id** — short slug (`nat-1`, `nat-2`, …)
> - **severity** — `High` (reads as translated / broken), `Medium` (understandable but no native would phrase it this way), `Low` (polish)
> - **quote** — the exact sentence or phrase, verbatim, so it is findable
> - **problem** — why this is not natural <TARGET_LANGUAGE>, in one sentence
> - **fix** — the concrete <TARGET_LANGUAGE> rewrite you would use
>
> If the text is clean, return an empty list — do not invent issues to seem useful.

### Step 4b: Present the round

Show the user the numbered findings as **Round N**, sorted by severity, each with quote → problem → proposed fix. If the list is empty, say so. `Actionable` = any High or Medium finding.

### Step 4c: Check exit conditions

- **Reviewer satisfied:** no actionable finding → report convergence, offer to apply remaining Low items in one pass, then go to Step 5.
- **Safety cap:** round counter reaches **5** → stop, tell the user plainly the loop hit its cap without full convergence (do not present the text as signed off), go to Step 5.
- Otherwise continue with Step 4d.

### Step 4d: Fix and loop

Apply every High and Medium fix with Edit (Low items too if trivial and clearly right). While fixing:

- Make the smallest edit that resolves the finding; keep surrounding sentences untouched.
- Reject a reviewer fix that breaks a hard rule (whiteboard test, preserved elements, `$ARGUMENTS` constraints, any style guide in scope) — note the rejection and why.
- Never let a fix alter code blocks, URLs, or frontmatter keys.

Keep a running changelog (round → finding id → change). Increment the counter, return to Step 4a with a completely fresh agent.

## Step 5: Faithfulness check

After the loop ends, if a source-language version exists (the original in translate mode, or a source file given in nativize-only mode), launch **one** Agent with both file paths: "Compare these two versions paragraph by paragraph. Report every place where the target-language text makes a different, weaker, or stronger technical claim than the source, drops a point, or adds one. Ignore wording style — only meaning. Return the same structured finding format, empty list if faithful."

Fix any real drift with Edit (restoring the source's meaning in natural target-language prose). If a fix changes a sentence substantially, run one final isolated native-reader round on just that — otherwise done. When no source-language file is available, skip this step and say so in the summary.

## Step 6: Summary

```
## Translation ready — <target-path>

Source language: <lang>   Target language: <lang>
Mode: <translate | nativize-only>
Backup: <path | none (new file)>
Words: <before → after | new file: N>
Ended after <N> review rounds because: <reviewer satisfied | good enough per user | 5-round cap>
Faithfulness check: <clean | M drifts fixed | skipped (no source file)>

### Round 1 — <n> findings fixed
- "<quote>" → "<new phrasing>"

<…one block per round…>

### Kept in the source language (notable calls)
- <term> — <one-line reason>
```

Keep it tight — this is the one message the user is guaranteed to read.

## Edge cases

- **Input file missing or language unclear:** stop and ask / report; never invent content or guess the target language.
- **Reviewer returns prose instead of the structured list:** extract the findings yourself; if impossible, rerun the agent once with the format reminder.
- **Reviewer churns** (re-flags phrasing a previous round deliberately chose, e.g. a kept original-language term): the hard rules win; overrule the finding, note it, and don't count it as actionable.
- **Very long post (> ~2500 words):** same flow; tell the reviewer explicitly to cover the *entire* text and not stop after the first findings.
- **User constraints conflict with these rules** (e.g. formal register, "translate all terms"): `$ARGUMENTS` wins; apply consistently everywhere.
