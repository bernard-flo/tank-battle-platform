# Next Steps (Alpha-MLP Pack v0.1)
- 목표: 시뮬레이터 기반 셀프플레이 → 진화탐색으로 MLP 가중 최적화
- 해야 할 일
  1) 브라우저 엔진을 축약한 Node 시뮬레이터(`scripts/sim/*`) 작성
  2) 평가 함수(생존수/남은 체력/딜량/라운드시간) 설계
  3) 유전탐색 루프(`scripts/train.js`): 변이/선택, 다중 시드
  4) 최상 개체 번들 `result/ai.txt`에 저장, 로그는 `.agent/log/*`
- 구현 팁
  - 플랫폼 입력/출력 스펙 동일 유지: `name/type/update` 3함수 번들
  - 안전을 위해 Node 시뮬에서 sandbox된 `Type`/`tankAPI`만 노출
  - 회피/공격/응집/벽 벡터 계산 일치시켜 온라인/오프라인 동작 차이를 최소화
