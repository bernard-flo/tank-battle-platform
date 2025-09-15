# Tank Battle AI Benchmark Report

- Workspace: `work/2025-09-15-10-25`
- Script: `result/2025-09-15-10-25.txt` (OmegaSigma team)
- Competitors analyzed: 1 (`result/2025-09-15-08-00.txt`)

## Summary
- Matches: 60 (baseSeed: 424242)
- Result vs 2025-09-15-08-00.txt: 60 wins, 0 losses, 0 draws
- Averages: Ticks 1121.33, RedAlive 5.067, BlueAlive 0.000, RedEnergy 327.13, BlueEnergy 0.00
- Simulator: `node simulator/cli.js --fast --concurrency 8`

## Why It Wins
- Predictive aim: exact intercept solve using target velocity smoothing.
- Bullet evasion: multi-step (6–7 tick) horizon risk scoring against enemy bullets and edges.
- Role ranges: Dealers kite at ~260–410, Tankers anchor at ~180–300; adaptive on low HP/finish.
- Smart strafing: orbit preferred target with perpendicular bias; inertia control avoids oscillation.
- Focus fire: shared tie-breaker (lowest health, then distance) aligns allies on the same target.

## Reproduce
```
scripts/simulate.sh \
  --red result/2025-09-15-10-25.txt \
  --blue result/2025-09-15-08-00.txt \
  --repeat 60 --concurrency 8 --seed 424242 --maxTicks 4500 --fast
```

JSON saved at `work/2025-09-15-10-25/agg_vs_2025-09-15-08-00.json`.
