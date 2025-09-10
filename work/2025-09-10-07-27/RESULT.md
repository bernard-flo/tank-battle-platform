# Apex Team – Final Comparison Results

- Timestamp: 2025-09-10-07-27
- Import File: result/2025-09-10-07-27/2025-09-10-07-27.txt
- Simulator: simulator/cli.js (runner=secure, fast mode)

## vs Vanguard (result/2025-09-10-07-21.txt)
Seed: 999001, Repeat: 400, Concurrency: 8
=== Batch Result ===
Matches: 400, BaseSeed: 999001
Wins   - Red: 336, Blue: 64, Draws: 0
Avg    - Ticks: 633.96, RedAlive: 2.3, BlueAlive: 0.28
AvgEne - Red: 111.34, Blue: 13

## vs Phalanx (result/2025-09-10-06-00.txt)
Seed: 555001, Repeat: 400, Concurrency: 8
=== Batch Result ===
Matches: 400, BaseSeed: 555001
Wins   - Red: 304, Blue: 72, Draws: 24
Avg    - Ticks: 1357.1, RedAlive: 1.5, BlueAlive: 0.52
AvgEne - Red: 45.56, Blue: 29.08

Notes:
- Composition: 1 Tanker (front), 5 Dealers (spread bias).
- Tactics: predictive aim (VM-persistent), bullet NA dodge, edge + ally separation, strafe ring, and kill-secure aggression when targets are low HP or enemies are few.
- The same code runs in tank_battle_platform.html (stateless fallback without VM persistence).
