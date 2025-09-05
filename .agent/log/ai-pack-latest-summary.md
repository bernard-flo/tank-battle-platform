# AI Pack Summary

- Source: scripts/train_roles.js (role search + NN weights)
- Models: 16→6→5 MLP per tank; features include self, nearest enemy, centroids, bullet threat, walls.
- Composition: 6 tanks in `result/ai.txt`, separated by lines `// ===== 다음 로봇 =====`
- Performance: 100/100 vs baseline (engine mirror), avg end tick ≈ 240.3

Import (tank_battle_platform.html):
- Open the HTML file
- Click Import for RED or BLUE team panel
- Paste full contents of `result/ai.txt`

Notes:
- Secure sandbox compatible (no globals). Uses only provided `tank`, `enemies`, `allies`, `bulletInfo`.
- Type mix is learned; engine auto reads each block's `type()`.
