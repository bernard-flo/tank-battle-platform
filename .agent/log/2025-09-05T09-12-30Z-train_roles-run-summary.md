# Train Roles Run Summary – 2025-09-05T09-12-30Z

- Command: `GENS=6 node scripts/train_roles.js`
- Final roles: [DEALER, NORMAL, TANKER, DEALER, TANKER, DEALER] (ids: [2,0,1,2,1,2])
- Output: `result/ai.txt` (6 tank MLP policies, import-compatible)
- Selfplay vs baseline: 60/60 wins, avgEndTick≈311.9
- Notes: short-run sanity pass to refresh bundle; longer GENS improves robustness.

