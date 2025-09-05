# train_roles 실행 요약
- 시각(UTC): $(date -u)
- 명령: GENS=12 node scripts/train_roles.js
- 평가: baseline 상대로 12전 12승 0무 0패
- 평균 종료 tick: ≈263.5
- 최종 역할 배열(Type): [0, 2, 1, 2, 2, 2]  // [NORMAL, DEALER, TANKER, DEALER, DEALER, DEALER]
- 산출물: result/ai.txt (6개 탱크 MLP 정책, Import 구분자 포함)
- 로그: .agent/log/*train_roles-gen-*.json, *train_roles-final.json, *selfplay-summary.json
- 메모: 시뮬레이터 규칙은 HTML과 동기화, move 재시도, 탄속/쿨다운 반영
