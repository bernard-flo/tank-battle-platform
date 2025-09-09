#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run the headless simulator CLI
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT_DIR/simulator/cli.js" "$@"

