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

2025-09-04 루프 #2 실행 체크리스트(보완 과제)
- [x] tools/sim 결과 저장 경로를 `tools/sim/results/`로 통일(cli/rr/search)
- [x] round_robin에서 `summary.csv` 생성(pair,winA,winB)
- [x] params 프리셋 디렉토리 생성 및 각 탱크별 기본값 작성(params/*.json)
- [x] engine.js에서 PARAMS 주입(`const PARAMS = Object.freeze(...)`)
- [x] 탱크 코드에서 상수 일부를 PARAMS 기반으로 치환(호환 fallback 유지)
- [x] search.js를 무작위+빔 탐색으로 개선하고 최상 해를 params/<key>.json 저장
- [x] README에 파라미터/범위/스코어 정의/실행 예시 추가

검증 체크
- [ ] 동일 시드에서 결과 일관성 유지
- [ ] rr 1회전/10회전 시간 로그 남김
- [ ] SUPER6 내전에서 v1 대비 승률 향상 지점 캡처 및 기록

2025-09-04 루프 #2-2 보완 과제
- [x] search.js: trial별 샘플 PARAMS를 params/<key>.json에 저장 후 평가(최종 best 저장)
- [x] round_robin.js: avgAliveDiff, avgTime 산출 및 summary.csv 컬럼 확장
- [x] README: RR 지표 정의와 파라미터 표 갱신, 실행 예시 최신화
- [x] params: 6종 모두 프리셋 파일 완비(누락 보강)
- [x] 재현성 로그: 동일 시드 2회 실행 결과 동일성 체크 로그 추가

다음 루프 아이템(제안)
- rr/cli 실행 시간 측정 및 한 줄 요약(동일 시드 반복 10회 평균)
- 탐색 scoring 가중치 튜닝(승점:생존시간=1:0.03~0.08 범위 테스트)
- 위험도 함수 개선: 탄 속도 벡터 기반 충돌 시간 예측(TTC) 가중
- params 스냅샷 버저닝: params/<bot>.json 변경 시 자동 백업(params/history)
