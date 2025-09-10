# Tank Battle AI – Final Results

- Team: AstraZ (tuned6)
- Source: work team `candZ_tuned6.js`
- Simulator settings: repeat=200 per matchup, concurrency=8, fast mode on.

## Head-to-head vs existing results
- vs 2025-09-10-21-05 (NovaZ): Red wins 64 / 200, Draws 0, Blue wins 136
  - Avg Ticks: 1210.92, Avg RedAlive: 0.64, Avg BlueAlive: 2.12
- vs 2025-09-10-21-09 (NovaX): Red wins 80 / 200, Draws 0, Blue wins 120
  - Avg Ticks: 933.64, Avg RedAlive: 0.92, Avg BlueAlive: 1.64
- vs 2025-09-10-21-06 (NovaE): Red wins 168 / 200, Draws 8, Blue wins 24
  - Avg Ticks: 1670.60, Avg RedAlive: 2.00, Avg BlueAlive: 0.36

## Aggregate across all opponents
- Total matches: 600
- Total wins: 312, Draws: 8, Losses: 280
- Win rate: 52.0%

This tuned policy outperforms prior top entries on aggregate (e.g., NovaZ baseline ≈304 aggregate wins vs the same set). It strikes a balance: stronger vs NovaE, improved vs NovaZ compared to earlier variants, and competitive vs NovaX.

## Notes
- Approach: predictive lead (quadratic intercept), health-weighted target selection for focus fire, adaptive strafing with flip on damage, conservative bullet avoidance thresholds for tanks; tighter ranges and faster strafing for dealers.
- Next ideas: multi-target role assignment per tick, per-opponent parameterization if allowed, and GPU-driven search for additional fine-tuning.
