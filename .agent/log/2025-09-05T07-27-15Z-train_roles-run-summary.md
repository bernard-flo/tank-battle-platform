## Train Roles Summary (2025-09-05T07:27:15Z)

- Script: scripts/train_roles.js
- Params: GENS=16, POP=20, ELITE=5 (기본값)
- Final roles: [DEALER, NORMAL, TANKER, DEALER, DEALER, DEALER] (raw: [2,0,1,2,2,2])
- Validation vs baseline: 50 matches → 50W-0L-0D, avgEndTick ≈ 255.1
- Output: result/ai.txt (6 tanks, 16→6→5 MLP, import separators included)

Notes:
- Stateless per-frame sandbox → policy-only design; small MLP for speed.
- Movement: weighted blend of evade/attack/orbit/wall vectors; retry on collision.
- Fire: nearest target aim with learned lead (clamped to [-12, +16] deg).
