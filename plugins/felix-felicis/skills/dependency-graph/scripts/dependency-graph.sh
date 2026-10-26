#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: dependency-graph.sh [source-root] [--depth N] [--layers top,...,bottom] [--min-weight N] [--lang auto|js|jvm] [--out DIR] [--include-tests]" >&2
  exit 2
}

source_root="src"
depth="1"
layers=""
min_weight="1"
language="auto"
out_dir=""
include_tests="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --depth) depth="$2"; shift 2 ;;
    --layers) layers="$2"; shift 2 ;;
    --min-weight) min_weight="$2"; shift 2 ;;
    --lang) language="$2"; shift 2 ;;
    --out) out_dir="$2"; shift 2 ;;
    --include-tests) include_tests="true"; shift ;;
    -h|--help) usage ;;
    -*) usage ;;
    *) source_root="${1%/}"; shift ;;
  esac
done

source_root="${source_root#./}"
[ -d "$source_root" ] || { echo "source root not found: $source_root (run from the repo root)" >&2; exit 1; }

count_files() {
  find "$source_root" -type f \( "$@" \) -not -path '*/node_modules/*' | wc -l | tr -d ' '
}

if [ "$language" = "auto" ]; then
  jvm_file_count="$(count_files -name '*.java' -o -name '*.kt')"
  js_file_count="$(count_files -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs')"
  if [ "$jvm_file_count" -gt "$js_file_count" ]; then language="jvm"; else language="js"; fi
fi

if [ "$language" = "jvm" ]; then
  while true; do
    subdirectories="$(find "$source_root" -mindepth 1 -maxdepth 1 -type d)"
    direct_source_files="$(find "$source_root" -mindepth 1 -maxdepth 1 -type f \( -name '*.java' -o -name '*.kt' \))"
    [ -n "$subdirectories" ] && [ "$(echo "$subdirectories" | wc -l | tr -d ' ')" -eq 1 ] && [ -z "$direct_source_files" ] || break
    source_root="$subdirectories"
  done
  echo "jvm sources, grouping below $source_root" >&2
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
temp_root="${TMPDIR:-/tmp}"
tools_dir="${temp_root%/}/dependency-graph-tools"
tools_bin="$tools_dir/node_modules/.bin"
out_dir="${out_dir:-${temp_root%/}/dependency-graph/$(basename "$PWD")}"

if [ ! -x "$tools_bin/depcruise" ] || [ ! -x "$tools_bin/wasm-graphviz-cli" ]; then
  echo "installing dependency-cruiser, typescript and graphviz (wasm) into $tools_dir ..." >&2
  npm install --silent --no-audit --no-fund --prefix "$tools_dir" \
    dependency-cruiser@18.7.0 typescript@5.9.3 @hpcc-js/wasm-graphviz-cli@1.11.4 >&2
fi

mkdir -p "$out_dir"
rm -f "$out_dir"/{report.md,report.html,depcruise.json,graph.json,recommendations.json} "$out_dir"/{graph,cycles,overview}.{dot,mmd,svg,png}

if [ "$language" = "jvm" ]; then
  node "$script_dir/collect-jvm-imports.mjs" "$source_root" > "$out_dir/depcruise.json"
else
  cruise_options=(--no-config --ts-pre-compilation-deps --do-not-follow node_modules --output-type json)
  [ -f tsconfig.json ] && cruise_options+=(--ts-config tsconfig.json)
  [ "$include_tests" = "true" ] || cruise_options+=(--exclude '(\.|/)(test|spec)s?\.[cm]?[jt]sx?$|/__tests__/')
  "$tools_bin/depcruise" "$source_root" "${cruise_options[@]}" > "$out_dir/depcruise.json"
fi

node "$script_dir/folder-graph.mjs" "$out_dir/depcruise.json" \
  --root "$source_root" --depth "$depth" --layers "$layers" --min-weight "$min_weight" --out "$out_dir"

for dot_file in "$out_dir"/*.dot; do
  svg_file="${dot_file%.dot}.svg"
  "$tools_bin/wasm-graphviz-cli" "$dot_file" > "$svg_file"
  if command -v resvg >/dev/null 2>&1; then
    resvg --zoom 2 --background white "$svg_file" "${svg_file%.svg}.png"
  fi
done

node "$script_dir/render-report.mjs" "$out_dir" >/dev/null

echo >&2
echo "written to $out_dir:" $(cd "$out_dir" && ls) >&2
