---
name: medium-publish
description: "Copy a markdown blog post to the clipboard as rich text for pasting straight into Medium's editor (macOS). Converts the markdown to formatted HTML, loads it onto the clipboard as rich text, and opens Medium's new-story editor so you paste it in with ⌘V."
allowed-tools: AskUserQuestion, Read, Write, Bash(textutil:*), Bash(osascript:*), Bash(open:*), Bash(rm:*)
---

# Skill: medium-publish

Prepares a markdown blog post for Medium by converting it to rich text, placing that rich text on the macOS clipboard, and opening Medium's new-story editor. You paste with ⌘V and the formatting — headings, bold, italic, lists, code, quotes, links — lands directly in the editor.

**Why rich-text paste?** Medium's contenteditable editor accepts pasted rich text and maps it onto its own formatting. Pasting is reliable, immediate, and stateless — no Gist to create, import, or delete.

**Why RTF on the clipboard?** macOS carries pasted rich text as the RTF pasteboard flavor, which the browser turns into HTML when you paste into Medium. `textutil` (built in) converts the HTML to RTF, and `osascript` loads it onto the clipboard — no external dependencies.

**Why image placeholders?** Rich-text paste cannot carry local or referenced images into Medium. Each markdown image becomes a `[Bild N]` marker so you can drop the real image in at that spot manually.

## Step 1 — Collect input

If a file path was provided as an argument, use it directly.

Otherwise ask via `AskUserQuestion`:

```
Which markdown file should I publish to Medium?

Please provide the full path to your .md file.
```

## Step 2 — Convert markdown to HTML

Read the file at `<input-path>` and produce a full HTML fragment in memory:

- Headings (`#`, `##`, …) → real `<h1>`, `<h2>`, … tags
- `**bold**` → `<strong>`, `_italic_` / `*italic*` → `<em>`
- Inline `` `code` `` → `<code>`
- Fenced ``` code blocks → a single `<p><code>…</code></p>`, where the block's lines are joined with `<br>` (a soft break, so Medium treats it as one paragraph), leading spaces on each line are replaced with `&nbsp;` so indentation survives, and the inner text is HTML-escaped (`<`, `>`, `&`, `"`). Example: a block of `plugins {` / `    alias(libs.plugins.kotlin.jvm)` / `}` becomes `<p><code>plugins {<br>&nbsp;&nbsp;&nbsp;&nbsp;alias(libs.plugins.kotlin.jvm)<br>}</code></p>`.
- `- ` / `* ` bullet lists → `<ul><li>…</li></ul>`, `1.` ordered lists → `<ol><li>…</li></ol>`
- `> ` blockquotes → `<blockquote>`
- `[text](url)` links → `<a href="url">text</a>`
- Each image `![alt](src)` → `<p>[Bild N]</p>`, with N incrementing from 1 in document order
- Normal paragraphs → `<p>…</p>`

Wrap the result in a minimal HTML document that declares a UTF-8 charset so emojis and other non-ASCII characters (e.g. `🔍` in a heading) survive the RTF conversion:

```html
<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>…</body></html>
```

Write it to `/tmp/medium-post.html`. This temp file is deleted in Step 3.

## Step 3 — Load rich text onto the clipboard

Convert the HTML to RTF and place it on the clipboard, then remove the temp files:

```bash
textutil -convert rtf -inputencoding UTF-8 -format html /tmp/medium-post.html -output /tmp/medium-post.rtf
osascript -e 'set the clipboard to (read (POSIX file "/tmp/medium-post.rtf") as «class RTF »)'
rm -f /tmp/medium-post.html /tmp/medium-post.rtf
```

## Step 4 — Open Medium and paste

Open Medium's new-story editor:

```bash
open "https://medium.com/new-story"
```

Then tell the user:

```
Rich text is on your clipboard, and Medium's new-story editor is now open.

To finish:
1. Make sure you're logged in to Medium.
2. Click into the editor and paste with ⌘V.
3. Review the formatting.
4. For each code block, click into it and press ⌘⌥6 to convert the whole block into a Medium code block. (Medium's rich paste can't create code blocks directly, so this one manual action per block is unavoidable.)

Image placeholders [Bild 1], [Bild 2], … mark where to add each image manually.
```
