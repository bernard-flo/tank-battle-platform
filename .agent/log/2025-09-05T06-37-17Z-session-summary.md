# Session Summary — RL Pack Update

- Training: scripts/train_roles.js (GENS=16, POP=20, ELITE=5, seeds=2000..2011)
- Roles: [TANKER, DEALER, TANKER, DEALER, DEALER, NORMAL]
- Output: result/ai.txt overwritten with 6 MLP policies (16→6→5)
- Eval: vs baseline 50 matches → 50W / 0L / 0D, avgEndTick≈260.4
- Notes: Next extend generations (>=24) and diversify opponent pool (mirror, stochastic variants) to improve generalization.
