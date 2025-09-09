#!/usr/bin/env bash
set -euo pipefail

# Quick wrapper for headless simulator with sensible defaults
# - Defaults to writing summary JSON to ./result.json unless --json provided
# - For replay, pass --replay replay.json (only when --repeat 1)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

args=("$@")

# If no explicit --json provided, add default
if ! printf '%s\n' "${args[@]}" | grep -q -- "^--json\b"; then
  args+=(--json "${ROOT_DIR}/result.json")
fi

exec node "$ROOT_DIR/simulator/cli.js" "${args[@]}"

