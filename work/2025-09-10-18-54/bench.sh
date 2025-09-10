#!/usr/bin/env bash
set -euo pipefail
ME="$1"
OPP="$2"
RPT="${3:-80}"
SEED="${4:-1000}"
OUTDIR="$5"
mkdir -p "$OUTDIR"
BNAME="$(basename "$ME")_vs_$(basename "$OPP")_${RPT}"
JSON="$OUTDIR/${BNAME}.json"
node simulator/cli.js --red "$ME" --blue "$OPP" --repeat "$RPT" --seed "$SEED" --json "$JSON" --concurrency 8 --runner secure --fast >/dev/null
REDW=$(jq -r '.aggregate.redWins' "$JSON")
BLUEW=$(jq -r '.aggregate.blueWins' "$JSON")
DRAW=$(jq -r '.aggregate.draws' "$JSON")
printf "%s,%s,%s,%s\n" "$BNAME" "$REDW" "$BLUEW" "$DRAW"
