#!/usr/bin/env bash
set -euo pipefail
TS="$1"
ME="result/$TS/$TS.txt"
OUT="work/$TS/out"
mkdir -p "$OUT"
# pick a curated set of opponents (latest + diverse)
mapfile -t OPP < <(ls -1 result/*/*.txt result/*.txt 2>/dev/null | sort | awk -v me="$ME" '$0!=me' | tail -n 10)
# Fallback if tail insufficient
if [ "${#OPP[@]}" -lt 5 ]; then
  mapfile -t OPP < <(ls -1 result/*/*.txt result/*.txt 2>/dev/null | awk -v me="$ME" '$0!=me' | shuf -n 8)
fi
CSV="$OUT/summary.csv"
echo "match,redWins,blueWins,draws" > "$CSV"
for opp in "${OPP[@]}"; do
  ./work/$TS/bench.sh "$ME" "$opp" 80 1200 "$OUT" | tee -a "$CSV"
  # also swap sides for fairness
  ./work/$TS/bench.sh "$opp" "$ME" 80 2200 "$OUT" | tee -a "$CSV"
  # Compute quick score per opponent pair
  :
done
# Summarize total
python3 - "$CSV" <<'PY'
import csv,sys
f=sys.argv[1]
R=B=D=0
with open(f) as fh:
  next(fh)
  for row in csv.reader(fh):
    _,r,b,d=row
    R+=int(r);B+=int(b);D+=int(d)
print(f"TOTAL_RED_WINS={R}")
print(f"TOTAL_BLUE_WINS={B}")
print(f"TOTAL_DRAWS={D}")
print(f"OVERALL_SCORE={R-B}")
PY
