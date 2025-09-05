# Session Summary

- Generated 6 neural MLP bots and then trained with evolutionary self-play (train_roles, 14 gens).
- Final roles: [DEALER, DEALER, TANKER, NORMAL, NORMAL, DEALER] (IDs may vary by placement).
- Sim vs baseline: 80/80 wins, avg end tick ~256.
- Import file ready: result/ai.txt
- Utilities:
  - scripts/generate_ai_pack.js with .scratchpad/ai_config.json
  - scripts/sim/run.js for batch evaluation
  - scripts/train_roles.js for role+weights evolution
