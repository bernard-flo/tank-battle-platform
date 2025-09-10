Nova v1 – Team AI Result

Summary
- Working dir: work/2025-09-10-15-08
- Published file: result/2025-09-10-15-08/2025-09-10-15-08.txt (importable in tank_battle_platform.html)
- Simulator: simulator/cli.js (per .agent/SIMULATOR.md); fast mode, secure runner
- Evaluation: vs 30 existing result teams, 40 seeds per side (repeat=40), baseSeed=12345, concurrency=8

Aggregate
Our Wins: 1355
Opp Wins: 1045
Net: 310

Top-10 Opponents by Net Wins (our_total, opp_total, net)
- result/2025-09-10-09-15/2025-09-10-09-15.txt: 66 vs 14 (net +52)
- result/2025-09-10-09-11/2025-09-10-09-11.txt: 64 vs 16 (net +48)
- result/2025-09-10-11-58/2025-09-10-11-58.txt: 64 vs 16 (net +48)
- result/2025-09-10-12-11/2025-09-10-12-11.txt: 64 vs 16 (net +48)
- result/2025-09-10-11-48/2025-09-10-11-48.txt: 57 vs 23 (net +34)
- result/2025-09-10-08-10/2025-09-10-08-10.txt: 56 vs 24 (net +32)
- result/2025-09-10-08-46/2025-09-10-08-46.txt: 56 vs 24 (net +32)
- result/2025-09-10-08-54/2025-09-10-08-54.txt: 56 vs 24 (net +32)
- result/2025-09-10-09-59/2025-09-10-09-59.txt: 56 vs 24 (net +32)
- result/2025-09-10-10-26/2025-09-10-10-26.txt: 56 vs 24 (net +32)

Approach
- Predictive aim: quadratic intercept with smoothed velocity and capped lead time.
- Threat avoidance: candidate-angle scoring using closest-approach distance and time-to-approach; edge penalty and center bias.
- Range control: role-tuned rMin/rMax with adaptive aggression for finishers and when enemy count thins.
- Separation: soft repulsion from nearest ally to reduce pathing conflicts.
- Jitter: subtle aim jitter to avoid being perfectly predictable.
- Roles: 2 Tankers frontline, 2 Dealers flanks, 2 Normals mid.

Notes
- Did not modify tank_battle_platform.html.
- .agent/SIMULATOR.md followed; used headless engine parity with HTML rules.
- Nova v2 (side-opening) underperformed asymmetrically and was not published.
