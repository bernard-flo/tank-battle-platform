#!/usr/bin/env bash
set -euo pipefail

# Run pairwise matches across all files in result/ in small chunks.
# Usage: scripts/round_robin.sh [--limit N] [--concurrency 10] [--repeat 10] [--seed 1] [--runner secure|fast]

LIMIT=8
REPEAT=10
SEED=1
CONCURRENCY=10
RUNNER="secure"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2;;
    --repeat) REPEAT="$2"; shift 2;;
    --seed) SEED="$2"; shift 2;;
    --concurrency) CONCURRENCY="$2"; shift 2;;
    --runner) RUNNER="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

mkdir -p work/matches

readarray -t FILES < <(printf '%s\n' result/*.txt | sort)

scheduled=0
jobs_running=0
max_parallel=4

for ((i=0;i<${#FILES[@]};i++)); do
  for ((j=i+1;j<${#FILES[@]};j++)); do
    red="${FILES[i]}"; blue="${FILES[j]}"
    out="work/matches/$(basename "$red")__vs__$(basename "$blue").json"
    if [[ -f "$out" ]]; then continue; fi
    echo "Running: $(basename "$red") vs $(basename "$blue")"
    node simulator/cli.js --red "$red" --blue "$blue" \
      --repeat "$REPEAT" --seed "$SEED" --concurrency "$CONCURRENCY" --fast --runner "$RUNNER" \
      --json "$out" &
    jobs_running=$((jobs_running+1))
    scheduled=$((scheduled+1))
    if [[ "$jobs_running" -ge "$max_parallel" ]]; then
      wait
      jobs_running=0
    fi
    if [[ "$scheduled" -ge "$LIMIT" ]]; then
      wait
      echo "Batch complete ($scheduled matches)."
      exit 0
    fi
  done
done
wait || true
echo "All pending pairs complete ($scheduled matches)."

