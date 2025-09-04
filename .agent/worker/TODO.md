# Worker TODO (SUPER6)

- 시뮬레이터 초안 작성(tools/sim):
  - engine.js: 이동/충돌/탄/데미지/승패 모델(60Hz, 속도/쿨 기준 반영)
  - loader.js: Function 기반 스니펫 샌드박스, name/type/update 추출
  - cli.js: 단일 매치 실행, 결과 CSV 저장
  - round_robin.js: 내전 전 조합 실행, summary.json 저장
  - search.js: 파라미터 무작위+톱N 빔 탐색, params/*.json
  - package.json 스크립트(sim/rr/search)
- 파라미터 주입: params/<파일명기반>.json → 각 탱크 코드에 병합 주입
- 재현성: seedrandom 도입 및 RNG 일원화
- 출력 정책: 콘솔 요약 10줄 내, 상세는 CSV/JSON에 저장
- 전략 파라미터 공통화: 반경/가중치/오프셋 상수 외부화 + 문서화
- 안정성: move 실패 시 재시도 로직 공통 유틸로 통일(중복 제거)
- 방어 로직 보강: 벽 근접 시 각 전략별 별도 우선 이동 각도 테이블

