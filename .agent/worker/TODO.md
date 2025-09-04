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

Hotfix/backlog:
- RR에서 무승부 과다: 명중률 개선 필요
  - 가설1: PARAMS.bulletSpeed per-tick 주입과 스니펫 리드샷(px/s 가정) 단위 불일치 → 스니펫에서 임계값(<100)이면 dt 역수로 환산(px/s) 보정 검토
  - 가설2: 발사 빈도/각 노이즈 과다 → fire_every 및 지터 범위 탐색 강화
  - 가설3: 탄 충돌 모델 단순 → BULLET_R 상향 완료(=16). 추가로 히트박스/시간보간 충돌 검토
- 결정성 검증은 OK. 성능 로그(1회/10회) 요약 추가 예정
