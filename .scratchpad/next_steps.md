# Next Steps (Training & Evaluation)

- Increase GENS to 24~48 for `train_roles.js` when time allows.
- Expand evaluation seeds: use 1000~1099 for more robust averaging.
- Opponent pool: add mirror matches (bundle vs bundle) and random role shuffles.
- Multi-objective: combine win rate with average remaining team energy.
- Try wider hidden layer (h=8~10) and slight L2 regularization on weights.
- Persist top-3 elites and rotate into self-play pool.
- Add quick smoke test script to ensure `result/ai.txt` parses into 6 robots.

