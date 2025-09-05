# AI Pack Summary

- Output: result/ai.txt (6 bots, import-ready)
- How to import:
  1) Open tank_battle_platform.html in browser
  2) Click Import on a team (RED/BLUE)
  3) Open result/ai.txt and copy all text
  4) Paste into modal, then Confirm
- Performance (vs baseline, 50 matches): 50 win / 0 draw / 0 loss, avg end tick ≈ 271.5
- Notes:
  - Role search enabled (Type mix evolved)
  - NN: in16-h6-out5 (Evade/Attack/Orbit/Wall/AimLead)
  - Safe sandbox: no global deps, `// ===== 다음 로봇 =====` separators included
