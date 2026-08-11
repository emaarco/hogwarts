---
name: svg-to-png
description: "Render an SVG to a PNG raster image locally with the resvg CLI — no upload, no web tool. Use when asked to convert, render, export, or rasterize a .svg file to a .png (or to a .jpg/.webp/.tiff via a PNG intermediate)."
allowed-tools: Bash, AskUserQuestion
---

# Skill: svg-to-png

Renders an SVG to a PNG locally using [`resvg`](https://github.com/linebender/resvg) — a Rust SVG rendering engine. Everything runs on the machine: no uploading the file to a web converter and downloading the result.

**What resvg does:** SVG → PNG only. It does not read raster images (no PNG → SVG tracing) and it does not emit JPG/WebP/PDF directly. For a non-PNG raster target, render to PNG first, then convert the PNG (see step 5).

## Steps

### 1. Check the precondition

`resvg` must be on `PATH`:

```bash
resvg --version
```

If it is missing, install it (macOS):

```bash
brew install resvg
```

For other platforms it ships via `cargo install resvg` or as a prebuilt binary from the [releases page](https://github.com/linebender/resvg/releases). Do not proceed until `resvg --version` succeeds.

### 2. Identify the source file

If the user has not given a `.svg` path, ask which file to render. Confirm the input is actually an SVG — resvg cannot rasterize a PNG or JPG into an SVG.

### 3. Determine the output path

Default: the same directory and basename as the source, with a `.png` extension (`diagram.svg` → `diagram.png`). If that would overwrite an existing file, mention it before running. Ask if the intended location is unclear.

### 4. Render

Basic conversion:

```bash
resvg input.svg output.png
```

Reach for these options when the request calls for them (see `resvg --help` for the full list):

| Need | Flag | Example |
| --- | --- | --- |
| Higher resolution | `-z, --zoom FACTOR` | `resvg -z 2 in.svg out.png` (2× pixel dimensions) |
| Exact pixel width/height | `-w` / `-h` | `resvg -w 1024 in.svg out.png` |
| Print/DPI scaling | `--dpi DPI` | `resvg --dpi 300 in.svg out.png` |
| Solid backdrop (SVGs are transparent by default) | `--background COLOR` | `resvg --background white in.svg out.png` |
| Crop to the drawing's tight bounds | `--export-area-drawing` | `resvg --export-area-drawing in.svg out.png` |
| Export one element by id | `--export-id ID` | `resvg --export-id logo in.svg out.png` |

Prefer `-z`/`--dpi` for crisp output over letting a downstream tool upscale the PNG.

**Fonts:** if the SVG contains text and glyphs render wrong or missing, the font is not in the system database. Point resvg at it with `--use-font-file <path>` or `--use-fonts-dir <dir>`, or run `resvg --list-fonts` to see what loaded.

### 5. (Optional) Convert the PNG to another raster format

resvg only writes PNG. For a different raster target, convert the rendered PNG with the macOS built-in `sips` — no extra install:

```bash
sips -s format jpeg output.png --out output.jpg    # or: png, tiff, gif, bmp
```

`sips` has no WebP encoder; use `cwebp output.png -o output.webp` (`brew install webp`) if WebP is required. Flatten transparency before JPEG (`--background white` in step 4), since JPEG has no alpha channel.

### 6. Confirm

Report the output path and the resolved pixel dimensions, and confirm the conversion succeeded. Batch requests: loop over the inputs, reusing the same flags for each.
