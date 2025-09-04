# Worker TODO (loop #2)

- tools/sim 엔진 실제화: 이동/탄/충돌/HP/쿨다운/승패, seedrandom 적용
- loader: Type/PARAMS 주입, RNG 대체, 샌드박스 로더
- cli/rr/search: results/* CSV/JSON 산출, 결정성 체크(--check)
- params: 6종 기본 프리셋 작성 및 히스토리 스냅샷
- search: beam + GA, trial마다 params/<bot>.json 덮어쓰기, 다상대 점수화
- README: 각도 단위(deg), 지표/파라미터 표, 실행 예시

Next steps (short):
- tools/sim 골격 생성 후 RR/검색 스크립트 연결
- 엔진 deg→rad 어댑터 및 bulletSpeed per-tick 정합
- RR summary.csv: pair,winA,winB,avgAliveDiff,avgTime
- search: 상위 N(beam) 유지 + GA 결과 results/ga_*.csv 기록

