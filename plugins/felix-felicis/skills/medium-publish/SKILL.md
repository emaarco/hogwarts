---
name: medium-publish
description: "Publish a markdown blog post to Medium via GitHub Gist import. Transforms headings to bold, creates a Gist, opens Medium's import page, then deletes the Gist."
allowed-tools: AskUserQuestion, Bash(gh gist create:*), Bash(gh gist delete:*), Bash(open:*), Bash(sed:*), Bash(mktemp:*), Bash(rm:*)
---

# Skill: medium-publish

Publishes a markdown blog post to Medium by creating a temporary public GitHub Gist and opening Medium's import page.

**Why Gist?** Medium's import feature requires a publicly accessible URL. GitHub Gists are public and immediately accessible, making them ideal as a transport layer. The Gist is deleted after import.

**Why heading transformation?** Medium's importer drops markdown heading syntax (`#`, `##`, etc.). Converting headings to bold (`**...**`) preserves visual hierarchy.

## Step 1 — Collect input

If a file path was provided as an argument, use it directly.

Otherwise ask via `AskUserQuestion`:

```
Which markdown file should I publish to Medium?

Please provide the full path to your .md file.
```

## Step 2 — Transform headings

Create a temporary file with all markdown headings converted to bold:

```bash
TMPFILE=$(mktemp /tmp/medium-publish-XXXXXX.md)
sed 's/^#\+[[:space:]]\(.*\)$/\*\*\1\*\*/g' "<input-file>" > "$TMPFILE"
```

This converts `# Title`, `## Section`, `### Subsection`, etc. → `**Title**`, `**Section**`, `**Subsection**`.

## Step 3 — Create public Gist

```bash
GIST_URL=$(gh gist create --public "$TMPFILE" 2>&1 | tail -n1)
GIST_ID=$(echo "$GIST_URL" | grep -o '[a-f0-9]\{32\}')
```

Remove the temp file immediately after:

```bash
rm "$TMPFILE"
```

## Step 4 — Confirm and open browser

Build the Medium import URL:

```bash
ENCODED_GIST=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$GIST_URL', safe=''))")
MEDIUM_IMPORT_URL="https://medium.com/p/import-story?importUrl=${ENCODED_GIST}"
```

Show the user the URLs and ask for confirmation via `AskUserQuestion`:

```
Ready to publish to Medium!

Gist URL: <gist-url>
Medium import URL: <medium-import-url>

Note: Medium will use your active browser session. Make sure you are logged in to Medium before continuing.

Shall I open the Medium import page in your browser?
```

Options: "Yes, open Medium" / "Cancel"

If cancelled: delete the Gist (`gh gist delete <gist-id>`) and stop.

## Step 5 — Open browser

```bash
open "$MEDIUM_IMPORT_URL"
```

## Step 6 — Wait for import completion

Ask via `AskUserQuestion`:

```
Medium's import page is now open in your browser.

Steps to complete:
1. Medium will show a preview of your post
2. Review the content looks correct
3. Click "Import" to confirm
4. Once imported, come back here

Have you finished importing in Medium?
```

Options: "Yes, import done — delete the Gist" / "Not yet (wait)" / "Something went wrong — delete the Gist anyway"

If "Not yet": show the same question again (loop once more, then proceed regardless).

## Step 7 — Delete Gist and report

```bash
gh gist delete "$GIST_ID"
```

Report:

```
Done! The Gist has been deleted.

Your post is now in Medium's editor as a draft. You can find it at:
https://medium.com/me/stories/drafts
```
