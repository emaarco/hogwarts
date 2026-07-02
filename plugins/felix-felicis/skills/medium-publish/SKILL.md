---
name: medium-publish
description: "Publish a markdown blog post to Medium via GitHub Gist import. Transforms headings to bold, creates a Gist, copies its URL to the clipboard, and opens Medium's import page for you to finish manually."
allowed-tools: AskUserQuestion, Bash(gh gist create:*), Bash(gh gist delete:*), Bash(open:*), Bash(pbcopy:*)
---

# Skill: medium-publish

Prepares a markdown blog post for Medium by creating a temporary public GitHub Gist, copying its URL to the clipboard, and opening Medium's import page so you can paste the link and finish the import manually.

**Why Gist?** Medium's import feature requires a publicly accessible URL. GitHub Gists are public and immediately accessible, making them ideal as a transport layer. The Gist is deleted after import.

**Why heading transformation?** Medium's importer drops markdown heading syntax (`#`, `##`, etc.). Converting headings to bold (`**...**`) preserves visual hierarchy.

**Why not build an import link?** Medium's import deep-links are brittle. Instead we open Medium's import page and hand you the Gist URL on the clipboard — you paste it and import manually, which is reliable and keeps you in control.

## Step 1 — Collect input

If a file path was provided as an argument, use it directly.

Otherwise ask via `AskUserQuestion`:

```
Which markdown file should I publish to Medium?

Please provide the full path to your .md file.
```

## Step 2 — Transform headings

Read the file at `<input-path>`. For every line that starts with one or more `#` characters followed by a space, replace it with the heading text wrapped in `**...**`. Leave all other lines exactly unchanged. Hold the full transformed content in memory — do NOT write it to disk.

Example:
- `# My Title` → `**My Title**`
- `## Section` → `**Section**`
- `### Sub` → `**Sub**`
- `Normal paragraph` → `Normal paragraph` (unchanged)

## Step 3 — Create public Gist

Pipe the transformed content directly into `gh gist create` — no temp file:

```bash
printf '%s' "<transformed-content>" | gh gist create --public --filename "post.md" -
```

Extract the Gist URL and ID:

```bash
GIST_URL=$(... | tail -n1)
GIST_ID=$(echo "$GIST_URL" | grep -o '[a-f0-9]\{32\}')
```

## Step 4 — Copy the Gist URL and open Medium's import page

Copy the Gist URL to the clipboard and open Medium's import page:

```bash
echo "$GIST_URL" | pbcopy
open "https://medium.com/p/import"
```

Then tell the user:

```
Gist URL copied to clipboard: <gist-url>

Medium's import page is now open in your browser.

To finish (manually):
1. Make sure you're logged in to Medium.
2. Paste the Gist URL (already on your clipboard) into the import field.
3. Click "Import" and review the preview.

Tip: from your profile you can also reach this via your picture → Stories → "Import a story".
```

## Step 5 — Wait for import completion

Ask via `AskUserQuestion`:

```
Have you finished importing in Medium?
```

Options:
- "Yes, import done — delete the Gist"
- "Not yet (wait)"
- "Something went wrong — delete the Gist anyway"
- "Copy the Gist URL to clipboard again"

If "Not yet": show the same question again (loop once more, then proceed regardless).

If "Copy the Gist URL to clipboard again":

```bash
echo "$GIST_URL" | pbcopy
```

Then loop back to the same Step 5 question so the user can signal completion or delete.

## Step 6 — Delete Gist and report

```bash
gh gist delete "$GIST_ID"
```

Report:

```
Done! The Gist has been deleted.

Your post is now in Medium's editor as a draft. You can find it at:
https://medium.com/me/stories/drafts
```
</content>
</invoke>
