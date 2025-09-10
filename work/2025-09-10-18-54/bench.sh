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
python3 - "$JSON" "$BNAME" <<'PY'
import json,sys
js=sys.argv[1]
name=sys.argv[2]
data=json.load(open(js))
agg=data.get('aggregate') or data.get('summary') or {}
rw=agg.get('redWins',0)
bw=agg.get('blueWins',0)
dr=agg.get('draws',0)
print(f"{name},{rw},{bw},{dr}")
PY
