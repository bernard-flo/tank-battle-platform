# AI Pack Latest Summary (2025-09-05T08:27Z)

- Source: `scripts/train_roles.js` (역할 동시 탐색 + NN 가중치)
- Model: 16→6→5 MLP per tank (tanh), 특징: 위치/체력/타입 원핫/최근접 적/적·아군 중심/탄 위협/벽 압력
- Bundle: `result/ai.txt` 내 6개 탱크 코드, 구분자 `// ===== 다음 로봇 =====` 포함
- Roles: [NORMAL, TANKER, NORMAL, DEALER, DEALER, DEALER]
- Perf: vs baseline — 12/12 승, avg end tick ≈ 254.1

Import 방법 (tank_battle_platform.html):
- HTML 실행 → RED/BLUE Import 클릭 → `result/ai.txt` 전체 붙여넣기
- 플랫폼이 `function name()` 기준으로 6개 블록을 자동 분리

Notes:
- 샌드박스 호환(외부 전역 미사용). 제공 API만 사용: `tank`, `enemies`, `allies`, `bulletInfo`.
- 각 블록의 `type()` 반환값으로 팀 조합 자동 구성.
