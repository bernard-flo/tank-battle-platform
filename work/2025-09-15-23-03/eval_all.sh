#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_FILE="$WS_DIR/ai.txt"
OUT_DIR="$WS_DIR/bench"
mkdir -p "$OUT_DIR"

REPEAT=${REPEAT:-10}
SEED=${SEED:-1}
CONC=${CONC:-4}

echo "AI: $AI_FILE"
echo "Writing results to: $OUT_DIR"

shopt -s nullglob
for opp in "$ROOT_DIR/result"/*.txt; do
  base="$(basename "$opp")"
  # skip self if same timestamp
  if [[ "$opp" == "$ROOT_DIR/result/$(basename "$WS_DIR").txt" ]]; then
    continue
  fi
  echo "==> vs $base"
  # our AI as red, opponent as blue
  node "$ROOT_DIR/simulator/cli.js" \
    --red "$AI_FILE" --blue "$opp" \
    --repeat "$REPEAT" --seed "$SEED" --concurrency "$CONC" \
    --json "$OUT_DIR/${base%.txt}_as_red.json" --fast >/dev/null
  # and as blue, opponent as red
  node "$ROOT_DIR/simulator/cli.js" \
    --red "$opp" --blue "$AI_FILE" \
    --repeat "$REPEAT" --seed "$SEED" --concurrency "$CONC" \
    --json "$OUT_DIR/${base%.txt}_as_blue.json" --fast >/dev/null
done

echo "Done. JSON summaries are in $OUT_DIR"

