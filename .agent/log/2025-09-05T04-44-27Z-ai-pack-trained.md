# AI Pack Trained (AlphaRL-evo)

- Files: result/ai.txt (6 bots, MLP-based)
- Types: [TANKER, TANKER, DEALER, DEALER, DEALER, NORMAL]
- Eval vs baseline: 50/50 wins
- Import into platform: open `tank_battle_platform.html` → Import RED/BLUE → paste contents of `result/ai.txt`

Notes:
- Each `update()` uses a 16→6→5 MLP to blend motion primitives and set aim lead.
- Safe utilities only; compatible with secure sandbox.
