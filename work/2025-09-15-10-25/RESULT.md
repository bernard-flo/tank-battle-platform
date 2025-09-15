# Tank Battle AI Benchmark Report

- Workspace: 
- Script:  (OmegaSigma team)
- Competitors analyzed: 1 ()

## Summary
- Matches: 60 (baseSeed: 424242)
- Result vs 2025-09-15-08-00.txt: 60 wins, 0 losses, 0 draws
- Averages: Ticks 1121.33, RedAlive 5.067, BlueAlive 0.000, RedEnergy 327.13, BlueEnergy 0.00
- Simulator: === Match Result ===
Seed: 453982453
Winner: BLUE
Ticks: 597
Red  - Alive: 0, Energy: 0
Blue - Alive: 2, Energy: 125

## Why It Wins
- Predictive aim: exact intercept solve using target velocity smoothing.
- Bullet evasion: multi‑step (6–7 tick) horizon risk scoring against enemy bullets and edges.
- Role ranges: Dealers kite at ~260–410, Tankers anchor at ~180–300; adaptive on low HP/finish.
- Smart strafing: orbit preferred target with perpendicular bias; inertia control avoids oscillation.
- Focus fire: shared tie‑breaker (lowest health, then distance) aligns allies on the same target.

## Reproduce
=== Batch Result ===
Matches: 60, BaseSeed: 424242
Wins   - Red: 60, Blue: 0, Draws: 0
Avg    - Ticks: 1121.33, RedAlive: 5.067, BlueAlive: 0
AvgEne - Red: 327.13, Blue: 0

JSON saved at .
