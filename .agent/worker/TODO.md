# Worker TODO (NEXT LOOP)

 - [done] tools/sim 스켈레톤 + 실행 스크립트
  - [done] engine/loader/cli/round_robin/search + README
  - [done] results 경로 통일: tools/sim/results/
 - [done] PARAMS 프리셋(JSON) 6종 저장 + history 스냅샷
 - [done] round_robin: summary.csv(pair,winA,winB,avgAliveDiff,avgTime) 출력 + 결정성 체크 로그
 - [done] search: 빔 탐색 + GA 모드, 시드 재현성 체크 옵션, 다상대 점수
 - [done] 시뮬레이터 성능 로그: 1회/10회 실행 시간 한 줄
- 문서화: 파라미터 범위/스코어 정의/실행 예시

다음 루프 아이템
- balance: 타임리밋/탄수명/반경 튜닝 시나리오 A/B/C 비교 자동화
- rr: perf NaN 출력 원인 수정(표시용 카운트 계산 보정)
- tanks: PARAMS 치환 비율 확대(남은 하드코딩 제거)
- search: timeW 스윕 및 상관 로그 추가, 조기중단(early stop)
- sim: 탄환 ricochet 옵션 실험(경계 반사), 충돌 반발력 테스트
