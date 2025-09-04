# Worker TODO (SUPER6) — 다음 루프 액션 아이템

- tanks: PARAMS 주입 지원 훅 추가(기본값 fallback 유지) → 점진 치환.
- tools/sim: rr/search 출력 경로 통일(results/), summary.csv 확장 컬럼 추가.
- tools/sim: search 시 trial별 params/<bot>.json 덮어쓰기 적용(결정성 확보).
- tools/sim: GA 모드 점수 산정 엔진 호출 기반으로 교체, timeW 가중 도입.
- tools/sim: 시드 결정성 체크(--check)와 1회/10회 실행 시간 로그.
- params: 6개 탱크 기본 프리셋 작성 및 history 스냅샷 저장.
- docs(sim): README 파라미터 범위/스코어 정의/실행 예시 업데이트.

핫픽스(최우선):
- sim 어댑터 호환성: engine.js에서 enemies 항목에 `health` 별칭 추가, 탱크 API에 `size` getter 추가(TANK_R 반환) — 기존 스니펫 참조 호환.
- rr 인자 파싱: round_robin.js에서 `seed/rounds/repeat`에 pickLast(배열 마지막) 적용해 CLI 덮어쓰기 동작 보장.

커밋 가이드 예시:
- fix(sim/adapter): add health alias and tank.size
- chore(sim/rr): prefer last CLI args for seed/rounds/repeat
