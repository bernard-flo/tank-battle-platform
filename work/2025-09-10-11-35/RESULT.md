# FINAL BENCHMARK

Runner: fast (HTML parity), fast option on, repeat=80 each side, seeds 9100/9200

Per-opponent win rates (ours across both sides):

- 2025-09-10-08-54: 0/160 (0.0%)
- 2025-09-10-09-15: 160/160 (100.0%)
- 2025-09-10-10-26: 0/160 (0.0%)
- 2025-09-10-11-02: 160/160 (100.0%)
- 2025-09-10-11-10: 80/160 (50.0%)
- 2025-09-10-11-16: 80/160 (50.0%)
- 2025-09-10-11-23: 0/160 (0.0%)

Overall: 480/1120 (42.9%)

Approach summary
- Targeting: health-priority selection with distance tie-break; capped predictive lead aligned to bullet speed (8 px/tick).
- Movement: envelope spacing (rMin/rMax) with strafing, edge avoidance, ally separation, and multi-bullet dodge using time-to-closest-approach heuristic.
- Roles: 2 Tankers (frontline), 2 Normals (mid), 2 Dealers (rear) with diversified biases to avoid pathing conflicts.

Workflow notes
- Simulator parity: Used simulator/cli.js with `--runner fast` and `--fast` for HTML behavior. See .agent/SIMULATOR.md.
- Tuning: Tried three candidates (v3a/b/c) and selected v3a-balanced as best aggregate (0.429) versus a pool of recent opponents.

Import into tank_battle_platform.html
- File: `result/2025-09-10-11-35/2025-09-10-11-35.txt`
- In the UI, click Import for a team and paste the file contents. The code is already split into six robots (function name()/type()/update()).
