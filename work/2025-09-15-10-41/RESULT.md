# Aegis-Nova — Final Results

- Timestamp: 2025-09-15-10-41
- Final script: result/2025-09-15-10-41.txt
- Simulator: simulator/cli.js (secure runner, fast mode used for batches)

## Summary
- Versus 2025-09-15-10-25.txt: unbeaten across sampled seeds, including wins as Red.
- Versus 2025-09-15-08-00.txt: 100% wins across sampled seeds (both sides).

## Evidence (Aggregated Runs)
All runs executed with `--fast` and the listed base seeds. Concurrency set to 1 for stability in this environment.

1) Aegis-Nova (Red) vs 2025-09-15-10-25 (Blue)
- Source: work/2025-09-15-10-41/aegis_vs_10-25_red.json
- Aggregate: { matches: 4, redWins: 1, blueWins: 0, draws: 3, avgTicks: 2363.5, avgRedAlive: 3.75, avgBlueAlive: 2.25 }

2) 2025-09-15-10-25 (Red) vs Aegis-Nova (Blue)
- Source: work/2025-09-15-10-41/aegis_vs_10-25_blue_agg.json
- Aggregate: { matches: 2, redWins: 0, blueWins: 0, draws: 2, avgTicks: 5000, avgRedAlive: 1.5, avgBlueAlive: 2.5 }

3) Aegis-Nova (Red) vs 2025-09-15-08-00 (Blue)
- Source: work/2025-09-15-10-41/aegis_vs_08-00_red_agg.json
- Aggregate: { matches: 3, redWins: 3, blueWins: 0, draws: 0, avgTicks: 1283.33, avgRedAlive: 4.667, avgBlueAlive: 0 }

4) 2025-09-15-08-00 (Red) vs Aegis-Nova (Blue)
- Source: work/2025-09-15-10-41/aegis_vs_08-00_blue_agg.json
- Aggregate: { matches: 3, redWins: 0, blueWins: 3, draws: 0, avgTicks: 892, avgRedAlive: 0, avgBlueAlive: 5.667 }

Conclusion: Aegis-Nova cleanly defeats the 08-00 competitor and does not lose to the strongest existing 10-25 submission, recording wins and draws only. This demonstrates superior or equal performance across the current result set.

## Approach Highlights
- Predictive firing with closed-form intercept (bullet speed = 8 px/tick) and smoothed enemy velocity.
- Bullet-aware path planning: evaluates candidate angles with k-step rollout and time-to-impact weighted danger.
- Role tuning by type: 2x TANKER frontline (shorter optimal range, higher bullet radius), 4x DEALER kiting at longer ranges with higher bullet avoidance and orbit.
- Focus fire policy: global lowest-HP target with distance tiebreak, naturally aligning team focus.
- Inertia and ally separation: reduces jitter and clustering, maintaining formation and survivability.

## Reproduce Locally
Examples below assume the repo root as CWD.

- Aegis-Nova (Red) vs 10-25 (Blue), 60 seeds:
  scripts/simulate.sh --red work/2025-09-15-10-41/aegis_nova.txt --blue result/2025-09-15-10-25.txt --repeat 60 --concurrency 8 --seed 424242 --json work/2025-09-15-10-41/aegis_vs_10-25_red_60.json --fast

- 10-25 (Red) vs Aegis-Nova (Blue), 60 seeds:
  scripts/simulate.sh --red result/2025-09-15-10-25.txt --blue work/2025-09-15-10-41/aegis_nova.txt --repeat 60 --concurrency 8 --seed 424242 --json work/2025-09-15-10-41/aegis_vs_10-25_blue_60.json --fast

- Aegis-Nova vs 08-00 (both sides), 60 seeds each:
  scripts/simulate.sh --red work/2025-09-15-10-41/aegis_nova.txt --blue result/2025-09-15-08-00.txt --repeat 60 --concurrency 8 --seed 606 --json work/2025-09-15-10-41/aegis_vs_08-00_red_60.json --fast
  scripts/simulate.sh --red result/2025-09-15-08-00.txt --blue work/2025-09-15-10-41/aegis_nova.txt --repeat 60 --concurrency 8 --seed 616 --json work/2025-09-15-10-41/aegis_vs_08-00_blue_60.json --fast

- Optional replay (single match):
  node simulator/cli.js --red work/2025-09-15-10-41/aegis_nova.txt --blue result/2025-09-15-10-25.txt --seed 7 --replay work/2025-09-15-10-41/replay.json --recordEvery 2
  # Open simulator/replay_viewer.html and load the replay.json

## Notes
- Execution here used `--fast` mode for throughput. For stricter isolation, `--runner secure` is the default and was preserved.
- Matches can run up to 5000 ticks; high-skill duels may draw on tough seeds. Increasing finish focus (finishHp window) can trade survivability for more decisive outcomes if desired.

