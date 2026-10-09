---
name: create-promo-clip
allowed-tools: Bash(npm *), Bash(npx *), Bash(node *), Read, Write, Edit, Agent, AskUserQuestion
description: Create a short, silent promo clip for a developer tool as an HTML/CSS animation and render it to MP4 and looping GIF with Playwright and ffmpeg. Use when the user wants a promo video, a LinkedIn clip or an explainer GIF for a tool or library, or wants to change texts, pacing or design of such a clip.
---

# Skill: create-promo-clip

Builds a clip as a plain HTML/CSS animation and captures it frame by frame. Every text and code snippet is written by hand, so the result is the same on every render and a change is an edited file plus a render.

## Setup

Copy `assets/` of this skill into a folder of the target repo, add its `node_modules`, `out` and `gifs` to `.gitignore`, then inside it:

```bash
npm install && npx playwright install chromium
npm run check                  # layout check: overflowing or overlapping texts
npm run render -- <variant>    # out/<variant>.mp4, 1080 × 1080, 30 fps, silent
npm run gif -- <variant>       # gifs/<variant>.gif, 720 × 720, 10 fps, loops
npm run render -- --preview    # serve the animations for a browser
```

- `variants/example/` is a minimal clip with every building block. Copy it for a new clip; its `timeline.js` starts with the named seconds that set the pacing.
- `shared/base.css` holds colours, fonts and the building blocks. Set the variables in `:root` to the user's brand first.
- The skill ships no domain content. Take code, models, diagrams and output from the target repo, and add what a clip needs to render them (for example a diagram library) as a dependency there.

## Story

Write the storyboard as numbered scenes with the exact on-screen text and confirm it before building; every render costs minutes.

1. **Hook:** one question the viewer recognises, three short lines.
2. **Problem** in the viewer's own code: the code, the change, the consequence.
3. **Card:** a two-line headline that names the problem, a subtitle that names the tool.
4. **What the tool does:** the command and its output, before anything uses the result.
5. **Same situation with the tool,** ending on the proof (build or compiler output), not on a call to action.

Leave out scenes that explain themselves.

## Texts

- One sentence runs across scenes: the status text stays while the picture changes and continues with a leading ellipsis.
- No labels that only name what the picture shows. Later texts build on earlier ones.
- Spoken, not written. At most two lines of about 40 characters.
- Modest claims: say what the viewer sees happen, no guarantees or numbers.
- Nothing that dates the clip (a year, "today", versions) unless the user wants it.

## Correctness

The audience uses the technology daily. Show code and output as the tool really produces them, with real formats and matching line numbers. Check how surrounding systems behave instead of assuming an error appears. Use public example data only, and tell the user what is simplified or invented.

## Design

- One full-size view at a time (`.view`): code, a diagram or a generated file. Never a split screen.
- Text only on hook and card; inside views one sentence in the status bar (`.status`).
- Commands and their output always in the docked `.console`, in the same place in every scene.
- Static picture: views fade in place, nothing slides, no typing effect for texts, no shadows.
- Brand colours and one font family; one accent per text screen; in code only keywords and strings are coloured.
- 25 to 40 seconds: about three seconds for a scene with a two-line text, two for a scene seen before.

## Render and review

1. `npm run check` after every change, then look at preview screenshots (`window.seek(second)`) before rendering.
2. Render in the background; an interrupted render leaves a broken file. Extract frames from the MP4 with ffmpeg and look at the scene changes.
3. For another language, copy the variant (`<name>-en`) and translate `index.html`.
4. For a README or docs page, cut the hook from the GIF (`ffmpeg -ss <hook seconds>`) and reference the file with a relative path.
5. For a new clip, let two subagents review stills and storyboard without your conclusions: a designer and a member of the audience. Repeat until neither finds anything substantial.

Do not publish a clip or book a paid tool; posting is the user's decision.
